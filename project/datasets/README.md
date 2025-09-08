# Datasets Directory

This directory is reserved for healthcare datasets that will be used to train the AI models.

## Expected Dataset Structure

Place your healthcare datasets in this folder. The Python application will automatically detect and use them for model training.

### Supported Dataset Types:

1. **Health Metrics Data** (CSV format)
   - Columns: user_id, timestamp, weight, height, blood_pressure, heart_rate, glucose_level, etc.
   - Used for health risk prediction models

2. **Symptom Analysis Data** (CSV format)
   - Columns: symptoms, conditions, severity, recommendations
   - Used for symptom-based health predictions

3. **Medical Images** (JPG/PNG format)
   - Organized in subfolders by condition type
   - Used for CNN-based medical image analysis

4. **Chat/Conversation Data** (JSON format)
   - Format: [{"user_message": "...", "ai_response": "...", "context": "..."}]
   - Used for training the conversational AI model

5. **Diet and Exercise Data** (CSV format)
   - Columns: health_profile, diet_plan, exercise_plan, outcomes
   - Used for generating personalized recommendations

## How to Add Datasets:

1. Place your dataset files directly in this folder
2. Ensure proper file naming conventions
3. The Python application will automatically detect new datasets
4. Model training will be triggered when datasets are updated

## File Naming Conventions:

- Health metrics: `health_metrics_*.csv`
- Symptoms: `symptoms_*.csv`
- Medical images: `medical_images/condition_name/`
- Conversations: `conversations_*.json`
- Diet/Exercise: `diet_exercise_*.csv`

**Note:** This folder is currently empty. Add your datasets here to enable AI model training.