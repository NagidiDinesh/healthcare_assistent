from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import json
import os
from datetime import datetime, timedelta
import requests
import uuid
from functools import wraps
import re
import numpy as np
import cv2
import pandas as pd
import tensorflow as tf
from keras.models import Sequential
from keras.layers import Dense, Conv2D, MaxPooling2D, Flatten, LSTM
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = 'healthcare_secret_key_2024'
app.config['UPLOAD_FOLDER'] = 'Uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Ensure directories exist
os.makedirs('data', exist_ok=True)
os.makedirs('uploads', exist_ok=True)
os.makedirs('datasets', exist_ok=True)
os.makedirs('models', exist_ok=True)

# Data file paths
USERS_FILE = 'data/users.json'
HEALTH_DATA_FILE = 'data/health_data.json'
CHAT_HISTORY_FILE = 'data/chat_history.json'
RECOMMENDATIONS_FILE = 'data/recommendations.json'

def load_json_file(filepath, default=None):
    """Load JSON file with error handling"""
    if default is None:
        default = {}
    try:
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                return json.load(f)
    except json.JSONDecodeError as e:
        logger.error(f"Corrupted JSON file {filepath}: {str(e)}")
        return default
    except Exception as e:
        logger.error(f"Error loading {filepath}: {str(e)}")
        return default

def save_json_file(filepath, data):
    """Save data to JSON file"""
    try:
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        logger.debug(f"Successfully saved data to {filepath}")
        return True
    except Exception as e:
        logger.error(f"Error saving {filepath}: {str(e)}")
        return False

def login_required(f):
    """Decorator to require login for protected routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            logger.warning("Unauthorized access attempt, redirecting to login")
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def get_ollama_response(prompt, context=""):
    try:
        ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:5001")
        ollama_url = f"{ollama_host}/api/generate"
        # ... rest of the function remains unchanged
        
        health_context = """You are a healthcare assistant AI. Provide helpful, accurate health advice while always recommending users consult healthcare professionals for serious concerns. Be supportive, informative, and encouraging about healthy lifestyle choices."""
        
        full_prompt = f"{health_context}\n\nContext: {context}\n\nUser: {prompt}\n\nAssistant:"
        
        payload = {
            "model": "llama2",
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9
            }
        }
        
        logger.debug(f"Sending request to Ollama: URL={ollama_url}, Payload={payload}")
        response = requests.post(ollama_url, json=payload, timeout=240)
        response.raise_for_status()
        response_data = response.json()
        logger.debug(f"Ollama response: {response_data}")
        return response_data.get('response', 'Sorry, I could not process your request.')
    except requests.exceptions.ConnectionError:
        logger.error(f"Failed to connect to Ollama server at {ollama_url}. Ensure 'ollama serve' is running.")
        return "I'm sorry, the AI assistant is temporarily unavailable. Please consult a healthcare professional for urgent concerns or try again later."
    except requests.exceptions.Timeout:
        logger.error(f"Ollama request timed out at {ollama_url}.")
        return "I'm sorry, the AI assistant is temporarily unavailable. Please consult a healthcare professional for urgent concerns or try again later."
    except requests.exceptions.HTTPError as e:
        logger.error(f"Ollama HTTP error: {e.response.status_code} - {e.response.text}")
        return f"Chatbot error: HTTP {e.response.status_code}. Please try again."
    except Exception as e:
        logger.error(f"Unexpected error in get_ollama_response: {str(e)}")
        return "I'm sorry, the AI assistant is temporarily unavailable. Please consult a healthcare professional for urgent concerns or try again later."

def calculate_health_risk(health_data):
    """Calculate health risk level based on health metrics"""
    risk_score = 0
    
    if 'weight' in health_data and 'height' in health_data:
        weight = float(health_data['weight'])
        height = float(health_data['height']) / 100
        bmi = weight / (height * height)
        
        if bmi < 18.5 or bmi > 30:
            risk_score += 2
        elif bmi > 25:
            risk_score += 1
    
    if 'blood_pressure_systolic' in health_data:
        systolic = int(health_data['blood_pressure_systolic'])
        if systolic > 140:
            risk_score += 3
        elif systolic > 130:
            risk_score += 2
        elif systolic > 120:
            risk_score += 1
    
    if 'heart_rate' in health_data:
        heart_rate = int(health_data['heart_rate'])
        if heart_rate > 100 or heart_rate < 60:
            risk_score += 1
    
    if 'glucose_level' in health_data:
        glucose = int(health_data['glucose_level'])
        if glucose > 140:
            risk_score += 3
        elif glucose > 126:
            risk_score += 2
        elif glucose > 100:
            risk_score += 1
    
    if risk_score >= 6:
        return "High"
    elif risk_score >= 3:
        return "Medium"
    else:
        return "Low"

def generate_recommendations(user_id, health_data):
    """Generate personalized recommendations based on health data"""
    recommendations = {
        'diet': [],
        'exercise': [],
        'lifestyle': []
    }
    
    if 'weight' in health_data and 'height' in health_data:
        weight = float(health_data['weight'])
        height = float(health_data['height']) / 100
        bmi = weight / (height * height)
        
        if bmi > 25:
            recommendations['diet'].extend([
                "Reduce caloric intake by 300-500 calories per day",
                "Increase fiber intake with whole grains and vegetables",
                "Limit processed foods and added sugars"
            ])
            recommendations['exercise'].extend([
                "30 minutes of cardio exercise 5 times per week",
                "Include strength training 2-3 times per week"
            ])
        elif bmi < 18.5:
            recommendations['diet'].extend([
                "Increase healthy caloric intake",
                "Include protein-rich foods in every meal",
                "Add healthy fats like nuts and avocados"
            ])
    
    if 'blood_pressure_systolic' in health_data:
        systolic = int(health_data['blood_pressure_systolic'])
        if systolic > 130:
            recommendations['diet'].extend([
                "Reduce sodium intake to less than 2300mg per day",
                "Increase potassium-rich foods like bananas and spinach"
            ])
            recommendations['lifestyle'].extend([
                "Practice stress management techniques",
                "Ensure 7-8 hours of quality sleep"
            ])
    
    if 'glucose_level' in health_data:
        glucose = int(health_data['glucose_level'])
        if glucose > 100:
            recommendations['diet'].extend([
                "Choose low glycemic index foods",
                "Limit refined carbohydrates and sugary drinks",
                "Include cinnamon and other blood sugar-friendly spices"
            ])
            recommendations['exercise'].extend([
                "Regular post-meal walks",
                "Include resistance training to improve insulin sensitivity"
            ])
    
    all_recommendations = load_json_file(RECOMMENDATIONS_FILE, {})
    all_recommendations[user_id] = {
        'recommendations': recommendations,
        'generated_at': datetime.now().isoformat()
    }
    save_json_file(RECOMMENDATIONS_FILE, all_recommendations)
    
    return recommendations

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('home'))
    return render_template('index.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if 'user_id' in session:
        return redirect(url_for('home'))
        
    if request.method == 'POST':
        data = request.get_json()
        
        required_fields = ['name', 'email', 'phone', 'gender', 'password', 'age']
        if not all(field in data for field in required_fields):
            return jsonify({'success': False, 'message': 'All fields are required'})
        
        if 'confirmPassword' in data and data['password'] != data['confirmPassword']:
            return jsonify({'success': False, 'message': 'Passwords do not match'})
        
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, data['email']):
            return jsonify({'success': False, 'message': 'Invalid email format'})
        
        users = load_json_file(USERS_FILE, {})
        
        for user_id, user_info in users.items():
            if user_info['email'] == data['email']:
                return jsonify({'success': False, 'message': 'Email already registered'})
        
        user_id = str(uuid.uuid4())
        users[user_id] = {
            'name': data['name'].strip(),
            'email': data['email'].strip(),
            'phone': data['phone'].strip(),
            'gender': data['gender'].strip(),
            'age': int(data['age']),
            'password_hash': generate_password_hash(data['password']),
            'created_at': datetime.now().isoformat(),
            'points': 0
        }
        
        if save_json_file(USERS_FILE, users):
            return jsonify({'success': True, 'message': 'Account created successfully'})
        else:
            return jsonify({'success': False, 'message': 'Failed to create account'})
    
    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('home'))
        
    if request.method == 'POST':
        data = request.get_json()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'success': False, 'message': 'Email and password are required'})
        
        users = load_json_file(USERS_FILE, {})
        
        user_id = None
        user_info = None
        for uid, info in users.items():
            if info['email'] == email:
                user_id = uid
                user_info = info
                break
        
        if user_info and check_password_hash(user_info['password_hash'], password):
            session['user_id'] = user_id
            session.permanent = True  # Persist session across browser restarts
            return jsonify({'success': True, 'message': 'Login successful'})
        else:
            return jsonify({'success': False, 'message': 'Invalid email or password'})
    
    return render_template('login.html')

@app.route('/home')
@login_required
def home():
    user_id = session['user_id']
    users = load_json_file(USERS_FILE, {})
    user_info = users.get(user_id, {})
    
    health_data = load_json_file(HEALTH_DATA_FILE, {})
    user_health = health_data.get(user_id, {})
    
    recommendations_data = load_json_file(RECOMMENDATIONS_FILE, {})
    user_recommendations = recommendations_data.get(user_id, {})
    
    return render_template('home.html', 
                         user=user_info, 
                         health_data=user_health,
                         recommendations=user_recommendations.get('recommendations', {}))

@app.route('/dashboard')
@login_required
def dashboard():
    user_id = session['user_id']
    users = load_json_file(USERS_FILE, {})
    user_info = users.get(user_id, {})
    
    health_data = load_json_file(HEALTH_DATA_FILE, {})
    user_health = health_data.get(user_id, {})
    
    return render_template('dashboard.html', user=user_info, health_data=user_health)

@app.route('/chat')
@login_required
def chat():
    return render_template('chat.html')

@app.route('/assistant')
@login_required
def assistant():
    return render_template('assistant.html')

@app.route('/api/health-data', methods=['GET', 'POST'])
@login_required
def health_data_api():
    user_id = session['user_id']
    logger.debug(f"Handling health-data request for user_id: {user_id}")

    data_file = HEALTH_DATA_FILE
    
    if request.method == 'POST':
        try:
            data = request.get_json()
            if not data:
                logger.error("No data provided in POST request")
                return jsonify({'success': False, 'message': 'No data provided'}), 400

            health_data = load_json_file(data_file, {})
            
            if user_id not in health_data:
                health_data[user_id] = {}
            
            health_data[user_id].update(data)
            health_data[user_id]['last_updated'] = datetime.now().isoformat()
            
            risk_level = calculate_health_risk(health_data[user_id])
            health_data[user_id]['risk_level'] = risk_level
            
            if not save_json_file(data_file, health_data):
                logger.error("Failed to save health data to file")
                return jsonify({'success': False, 'message': 'Failed to save health data'}), 500
            
            recommendations = generate_recommendations(user_id, health_data[user_id])
            
            users = load_json_file(USERS_FILE, {})
            if user_id in users:
                users[user_id]['points'] = users[user_id].get('points', 0) + 10
                if not save_json_file(USERS_FILE, users):
                    logger.error("Failed to save user points")
            
            logger.debug(f"Health data saved for user_id: {user_id}, data: {data}")
            return jsonify({
                'success': True,
                'message': 'Health data updated successfully',
                'risk_level': risk_level,
                'recommendations': recommendations,
                'points_earned': 10
            })
        except Exception as e:
            logger.error(f"Error saving health data: {str(e)}")
            return jsonify({'success': False, 'message': f'Failed to save health data: {str(e)}'}), 500
    
    else:
        try:
            health_data = load_json_file(data_file, {})
            user_health = health_data.get(user_id, {})
            logger.debug(f"Health data retrieved for user_id: {user_id}, data: {user_health}")
            return jsonify(user_health)
        except json.JSONDecodeError:
            logger.error("Corrupted health_data.json")
            return jsonify({'success': False, 'message': 'Corrupted health data file'}), 500
        except Exception as e:
            logger.error(f"Error loading health data: {str(e)}")
            return jsonify({'success': False, 'message': f'Failed to load health data: {str(e)}'}), 500

@app.route('/api/chat', methods=['POST'])
@login_required
def chat_api():
    user_id = session['user_id']
    data = request.get_json()
    message = data.get('message', '').strip()
    
    if not message:
        return jsonify({'success': False, 'message': 'Message cannot be empty'})
    
    health_data = load_json_file(HEALTH_DATA_FILE, {})
    user_health = health_data.get(user_id, {})
    
    context = f"User's health data: {json.dumps(user_health)}" if user_health else "No health data available"
    
    ai_response = get_ollama_response(message, context)
    
    chat_history = load_json_file(CHAT_HISTORY_FILE, {})
    if user_id not in chat_history:
        chat_history[user_id] = []
    
    chat_entry = {
        'timestamp': datetime.now().isoformat(),
        'user_message': message,
        'ai_response': ai_response
    }
    
    chat_history[user_id].append(chat_entry)
    
    chat_history[user_id] = chat_history[user_id][-50:]
    
    if save_json_file(CHAT_HISTORY_FILE, chat_history):
        logger.debug(f"Chat history saved for user_id: {user_id}")
    else:
        logger.error("Failed to save chat history")
    
    return jsonify({
        'success': True,
        'response': ai_response,
        'timestamp': chat_entry['timestamp']
    })

@app.route('/api/chat/history')
@login_required
def chat_history_api():
    user_id = session['user_id']
    try:
        chat_history = load_json_file(CHAT_HISTORY_FILE, {})
        user_history = chat_history.get(user_id, [])
        logger.debug(f"Chat history retrieved for user_id: {user_id}, entries: {len(user_history)}")
        return jsonify(user_history)
    except json.JSONDecodeError:
        logger.error("Corrupted chat_history.json")
        return jsonify({'success': False, 'message': 'Corrupted chat history file'}), 500
    except Exception as e:
        logger.error(f"Error loading chat history: {str(e)}")
        return jsonify({'success': False, 'message': f'Failed to load chat history: {str(e)}'}), 500

@app.route('/api/user/profile', methods=['GET', 'POST'])
@login_required
def user_profile_api():
    user_id = session['user_id']
    users = load_json_file(USERS_FILE, {})
    
    if request.method == 'POST':
        data = request.get_json()
        
        if user_id in users:
            allowed_fields = ['name', 'age', 'phone']
            for field in allowed_fields:
                if field in data:
                    users[user_id][field] = data[field]
            
            if 'current_password' in data and 'new_password' in data:
                if check_password_hash(users[user_id]['password_hash'], data['current_password']):
                    users[user_id]['password_hash'] = generate_password_hash(data['new_password'])
                else:
                    return jsonify({'success': False, 'message': 'Current password is incorrect'})
            
            save_json_file(USERS_FILE, users)
            return jsonify({'success': True, 'message': 'Profile updated successfully'})
        else:
            return jsonify({'success': False, 'message': 'User not found'})
    
    else:
        user_info = users.get(user_id, {})
        safe_info = {k: v for k, v in user_info.items() if k != 'password_hash'}
        return jsonify(safe_info)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

def train_cnn():
    """Train CNN on image datasets if available"""
    image_files = [f for f in os.listdir('datasets') if f.lower().endswith(('.jpg', '.png'))]
    if not image_files:
        print("No image files found for CNN training.")
        return

    images = []
    labels = []
    for f in image_files:
        img = cv2.imread(os.path.join('datasets', f))
        if img is None:
            continue
        img = cv2.resize(img, (128, 128))
        images.append(img / 255.0)
        label = 1 if 'healthy' in f.lower() else 0
        labels.append(label)

    if len(images) < 2:
        print("Insufficient images for CNN training.")
        return

    X = np.array(images)
    y = tf.keras.utils.to_categorical(labels, 2)

    model = Sequential([
        Conv2D(32, (3, 3), activation='relu', input_shape=(128, 128, 3)),
        MaxPooling2D(2, 2),
        Flatten(),
        Dense(128, activation='relu'),
        Dense(2, activation='softmax')
    ])
    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
    model.fit(X, y, epochs=10, validation_split=0.2, verbose=0)
    model.save('models/cnn_model.h5')
    print("CNN model trained and saved.")

def train_rnn():
    """Train RNN (LSTM) on CSV datasets if available"""
    csv_files = [f for f in os.listdir('datasets') if f.lower().endswith('.csv')]
    if not csv_files:
        print("No CSV files found for RNN training.")
        return

    df = pd.read_csv(os.path.join('datasets', csv_files[0]))
    if len(df.columns) < 2:
        print("Invalid CSV format for RNN training.")
        return

    data = df.iloc[:, 1].values.astype(float)
    if len(data) < 20:
        print("Insufficient data for RNN training.")
        return

    data = (data - data.min()) / (data.max() - data.min() + 1e-7)

    seq_length = 10
    X, y = [], []
    for i in range(len(data) - seq_length):
        X.append(data[i:i + seq_length])
        y.append(data[i + seq_length])

    X = np.array(X).reshape(-1, seq_length, 1)
    y = np.array(y)

    model = Sequential([
        LSTM(50, input_shape=(seq_length, 1)),
        Dense(1)
    ])
    model.compile(loss='mse', optimizer='adam')
    model.fit(X, y, epochs=10, batch_size=32, verbose=0)
    model.save('models/rnn_model.h5')
    print("RNN model trained and saved.")

def train_gan():
    """Train GAN on image datasets if available"""
    image_files = [f for f in os.listdir('datasets') if f.lower().endswith(('.jpg', '.png'))]
    if not image_files:
        print("No image files found for GAN training.")
        return

    images = []
    for f in image_files:
        img = cv2.imread(os.path.join('datasets', f))
        if img is None:
            continue
        img = cv2.resize(img, (64, 64))
        images.append(img / 255.0)

    if len(images) < 32:
        print("Insufficient images for GAN training.")
        return

    images = np.array(images)

    generator = Sequential([
        Dense(256, input_dim=100, activation='relu'),
        Dense(512, activation='relu'),
        Dense(1024, activation='relu'),
        Dense(64 * 64 * 3, activation='sigmoid'),
        tf.keras.layers.Reshape((64, 64, 3))
    ])

    discriminator = Sequential([
        Flatten(input_shape=(64, 64, 3)),
        Dense(1024, activation='relu'),
        Dense(512, activation='relu'),
        Dense(256, activation='relu'),
        Dense(1, activation='sigmoid')
    ])
    discriminator.compile(loss='binary_crossentropy', optimizer='adam')

    discriminator.trainable = False
    gan = Sequential([generator, discriminator])
    gan.compile(loss='binary_crossentropy', optimizer='adam')

    epochs = 100
    batch_size = min(32, len(images))
    for e in range(epochs):
        idx = np.random.randint(0, images.shape[0], batch_size)
        real_imgs = images[idx]
        noise = np.random.normal(0, 1, (batch_size, 100))
        fake_imgs = generator.predict(noise, verbose=0)
        d_loss_real = discriminator.train_on_batch(real_imgs, np.ones(batch_size))
        d_loss_fake = discriminator.train_on_batch(fake_imgs, np.zeros(batch_size))
        noise = np.random.normal(0, 1, (batch_size, 100))
        g_loss = gan.train_on_batch(noise, np.ones(batch_size))

    generator.save('models/generator.h5')
    print("GAN model trained and saved.")

class HealthEnv:
    def __init__(self):
        self.state = np.array([0.5])
        self.actions = [0, 1, 2]

    def step(self, action):
        if action == 0:
            reward = np.random.normal(0.1, 0.05)
        elif action == 1:
            reward = np.random.normal(0.2, 0.1)
        else:
            reward = np.random.normal(0.05, 0.03)
        self.state += reward
        self.state = np.clip(self.state, 0, 1)
        done = self.state >= 1
        return self.state, reward, done, {}

    def reset(self):
        self.state = np.array([0.5])
        return self.state

def train_rl():
    """Train Deep Q-Learning (DQN) for continuous learning"""
    env = HealthEnv()

    model = Sequential([
        Dense(24, input_dim=1, activation='relu'),
        Dense(24, activation='relu'),
        Dense(3, activation='linear')
    ])
    model.compile(loss='mse', optimizer='adam')

    gamma = 0.95
    epsilon = 1.0
    epsilon_min = 0.01
    epsilon_decay = 0.995
    episodes = 100

    for e in range(episodes):
        state = env.reset()
        state = state.reshape(1, -1)
        done = False
        while not done:
            if np.random.rand() <= epsilon:
                action = np.random.choice(env.actions)
            else:
                action = np.argmax(model.predict(state, verbose=0)[0])
            next_state, reward, done, _ = env.step(action)
            next_state = next_state.reshape(1, -1)
            target = reward
            if not done:
                target += gamma * np.amax(model.predict(next_state, verbose=0)[0])
            target_f = model.predict(state, verbose=0)
            target_f[0][action] = target
            model.fit(state, target_f, epochs=1, verbose=0)
            state = next_state
        if epsilon > epsilon_min:
            epsilon *= epsilon_decay

    model.save('models/dqn_model.h5')
    print("DQN model trained and saved.")

def train_sarsa():
    """Train SARSA for continuous learning (tabular version)"""
    env = HealthEnv()

    q_table = np.zeros((10, 3))
    alpha = 0.1
    gamma = 0.95
    epsilon = 1.0
    epsilon_min = 0.01
    epsilon_decay = 0.995
    episodes = 100

    for e in range(episodes):
        state = env.reset()
        s_idx = int(state[0] * 9)
        if np.random.rand() < epsilon:
            action = np.random.choice(env.actions)
        else:
            action = np.argmax(q_table[s_idx])
        done = False
        while not done:
            next_state, reward, done, _ = env.step(action)
            ns_idx = int(next_state[0] * 9)
            if np.random.rand() < epsilon:
                next_action = np.random.choice(env.actions)
            else:
                next_action = np.argmax(q_table[ns_idx])
            q_table[s_idx, action] += alpha * (reward + gamma * q_table[ns_idx, next_action] - q_table[s_idx, action])
            s_idx = ns_idx
            action = next_action
        if epsilon > epsilon_min:
            epsilon *= epsilon_decay

    np.save('models/sarsa_qtable.npy', q_table)
    print("SARSA Q-table trained and saved.")

def train_models():
    """Train all models automatically on startup"""
    train_cnn()
    train_rnn()
    train_gan()
    train_rl()
    train_sarsa()

if __name__ == '__main__':
    print("Healthcare Personal Assistant System")
    print("==================================")
    print("Starting Flask server...")
    print("Make sure Ollama is running with: ollama serve")
    print("And the llama2 model is available: ollama pull llama2")
    print("Training AI models...")
    train_models()
    print("Training completed.")
    app.run(debug=True, host='0.0.0.0', port=5000)