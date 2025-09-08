# Healthcare Personal Assistant System

A comprehensive AI-powered healthcare companion that helps users monitor their health, get personalized recommendations, and track wellness progress over time.

## 🏥 Features

### Core Functionality
- **User Authentication**: Secure signup/login with personal health profiles
- **Health Data Tracking**: Monitor vital signs, BMI, blood pressure, glucose levels, and more
- **AI-Powered Health Assistant**: Chat with an intelligent health advisor using Ollama (Llama model)
- **Personalized Recommendations**: Get custom diet plans, exercise routines, and lifestyle tips
- **Risk Assessment**: AI-driven health risk analysis and predictions
- **Interactive Dashboard**: Visualize health trends with charts and graphs
- **Voice Assistant**: Speech-to-text and text-to-speech capabilities
- **Medical Report OCR**: Upload and analyze medical documents
- **Gamification**: Earn points and rewards for healthy behaviors

### Advanced AI Features
- **Symptom Analysis**: AI-powered symptom evaluation and insights
- **Health Trend Prediction**: Machine learning models for health forecasting
- **Personalized Coaching**: Adaptive recommendations based on progress
- **Medical Image Analysis**: CNN-based analysis of medical images (when datasets are provided)
- **Natural Language Processing**: Advanced conversational AI for health guidance

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- Node.js (for frontend dependencies)
- Ollama installed and running locally

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd healthcare-assistant
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up Ollama**
   ```bash
   # Install Ollama (visit https://ollama.ai for installation instructions)
   ollama serve
   ollama pull llama2
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Access the application**
   - Open your web browser and go to `http://localhost:5000`
   - Create an account or login to get started

## 📊 Dataset Integration

The system supports various healthcare datasets for AI model training:

### Adding Datasets
1. Place your datasets in the `datasets/` folder
2. Supported formats: CSV, JSON, JPG, PNG
3. The system will automatically detect and use new datasets

### Dataset Types
- **Health Metrics**: User vital signs and measurements
- **Symptom Data**: Symptom-condition mappings
- **Medical Images**: For CNN-based analysis
- **Conversation Data**: For chatbot training
- **Diet/Exercise Plans**: For recommendation generation

See `datasets/README.md` for detailed dataset specifications.

## 🛠 Technology Stack

### Backend
- **Flask**: Web framework
- **Python**: Core programming language
- **Ollama**: Local AI model inference
- **JSON**: Data storage (easily replaceable with databases)

### Frontend
- **HTML5**: Structure and semantics
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **Vanilla JavaScript**: Interactive functionality
- **Chart.js**: Data visualization

### AI/ML
- **Ollama (Llama 2)**: Primary AI model for conversations
- **TensorFlow**: Deep learning framework
- **scikit-learn**: Traditional ML algorithms
- **OpenCV**: Computer vision tasks
- **Tesseract OCR**: Text extraction from images

## 🏗 Project Structure

```
healthcare-assistant/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # Project documentation
├── templates/            # HTML templates
│   ├── base.html
│   ├── index.html
│   ├── home.html
│   ├── dashboard.html
│   ├── chat.html
│   └── assistant.html
├── static/               # Static assets
│   ├── css/
│   │   └── style.css     # Main stylesheet
│   └── js/
│       ├── main.js       # Core JavaScript
│       ├── dashboard.js  # Dashboard functionality
│       ├── chat.js       # Chat interface
│       └── assistant.js  # Health assistant
├── data/                 # JSON data storage
├── uploads/              # File uploads
└── datasets/             # AI training datasets
```

## 🎯 Usage Guide

### Getting Started
1. **Sign Up**: Create your account with basic health information
2. **Complete Profile**: Add your health metrics and goals
3. **Chat with AI**: Start conversations with the health assistant
4. **Track Progress**: Monitor your health data over time
5. **Follow Recommendations**: Implement personalized health advice

### Key Features

#### Health Dashboard
- View all your health metrics in one place
- Interactive charts showing trends over time
- Risk assessment based on your data
- Quick health data entry

#### AI Chat Assistant
- Natural language conversations about health
- Personalized advice based on your profile
- Voice input/output capabilities
- Context-aware responses

#### Health Assessment
- Comprehensive health data collection
- AI-powered risk analysis
- Symptom evaluation and insights
- Medical report analysis via OCR

## 🔧 Configuration

### Ollama Setup
Make sure Ollama is running with the Llama 2 model:
```bash
ollama serve
ollama pull llama2
```

### Customization
- Modify `static/css/style.css` for styling changes
- Update `templates/` for UI modifications
- Add new routes in `app.py` for additional functionality

## 🔐 Security Features

- Secure password hashing with Werkzeug
- Session-based authentication
- Input validation and sanitization
- File upload restrictions
- XSS protection

## 🚀 Deployment

### Local Development
```bash
python app.py
```

### Production Deployment
1. Use a production WSGI server (Gunicorn, uWSGI)
2. Set up a reverse proxy (Nginx)
3. Configure environment variables
4. Set up SSL/TLS certificates
5. Configure database (if replacing JSON storage)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🆘 Support

For support, please:
1. Check the documentation
2. Review existing issues
3. Create a new issue with detailed information
4. Contact the development team

## 🔮 Future Enhancements

- Integration with wearable devices
- Advanced machine learning models
- Telemedicine features
- Multi-language support
- Mobile app development
- Integration with healthcare APIs
- Advanced data analytics
- Personalized medication reminders

---

**⚠️ Disclaimer**: This application is for educational and informational purposes only. Always consult qualified healthcare professionals for medical advice, diagnosis, and treatment decisions.