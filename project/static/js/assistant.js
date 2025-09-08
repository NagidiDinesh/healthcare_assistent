javascript
// Assistant JavaScript functionality

let currentSection = 'diet';
let healthAssessmentData = {};

// Sanitize HTML to prevent XSS
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Initialize Assistant
document.addEventListener('DOMContentLoaded', function() {
    initializeAssistant();
});

function initializeAssistant() {
    setupAssistantEventListeners();
    setupFileUpload();
    lazyLoadHealthData();
}

function setupAssistantEventListeners() {
    document.addEventListener('click', function(e) {
        if (e.target.matches('[onclick*="saveQuickHealth"]')) {
            e.preventDefault();
            saveQuickHealth();
        }
        if (e.target.matches('[onclick*="showDetailedHealthForm"]')) {
            e.preventDefault();
            showDetailedHealthForm();
        }
        if (e.target.matches('[onclick*="showTab"]')) {
            e.preventDefault();
            const tabName = e.target.getAttribute('onclick').match(/'(\w+)'/)[1];
            showTab(tabName);
        }
        if (e.target.matches('[onclick*="analyzeSymptoms"]')) {
            e.preventDefault();
            analyzeSymptoms();
        }
        if (e.target.matches('[onclick*="clearSymptoms"]')) {
            e.preventDefault();
            clearSymptoms();
        }
    });
    
    const detailedHealthForm = document.getElementById('detailedHealthForm');
    if (detailedHealthForm) {
        detailedHealthForm.setAttribute('role', 'form');
        detailedHealthForm.addEventListener('submit', handleDetailedHealthSubmit);
    }
    
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleFileDrop);
    }
}

async function saveQuickHealth() {
    const data = {};
    
    const quickWeight = document.getElementById('quickWeight');
    const quickSystolic = document.getElementById('quickSystolic');
    const quickDiastolic = document.getElementById('quickDiastolic');
    const quickHeartRate = document.getElementById('quickHeartRate');
    const quickGlucose = document.getElementById('quickGlucose');
    
    if (quickWeight?.value) data.weight = parseFloat(quickWeight.value);
    if (quickSystolic?.value) data.blood_pressure_systolic = parseInt(quickSystolic.value);
    if (quickDiastolic?.value) data.blood_pressure_diastolic = parseInt(quickDiastolic.value);
    if (quickHeartRate?.value) data.heart_rate = parseInt(quickHeartRate.value);
    if (quickGlucose?.value) data.glucose_level = parseInt(quickGlucose.value);
    
    if (Object.keys(data).length === 0) {
        showNotification('Please enter at least one health metric', 'warning');
        return;
    }
    
    try {
        const response = await apiRequest('/api/health-data', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (response.success) {
            showNotification(`${response.message} (+${response.points_earned || 0} points!)`, 'success');
            [quickWeight, quickSystolic, quickDiastolic, quickHeartRate, quickGlucose]
                .forEach(input => { if (input) input.value = ''; });
            lazyLoadHealthData();
        } else {
            showNotification(response.message || 'Failed to save health data', 'error');
        }
    } catch (error) {
        console.error('Error saving health data:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

function lazyLoadHealthData() {
    const riskAssessment = document.getElementById('riskAssessment');
    if (!riskAssessment) return;
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadHealthData();
                loadRecommendations();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    observer.observe(riskAssessment);
}

async function loadHealthData() {
    const cacheKey = 'health_assessment_data';
    const cacheExpiration = 15 * 60 * 1000;
    const cachedData = getFromStorage(cacheKey);
    
    if (cachedData && cachedData.timestamp && Date.now() - cachedData.timestamp < cacheExpiration) {
        healthAssessmentData = cachedData.data;
        updateRiskAssessment(healthAssessmentData);
        return;
    }
    
    try {
        const response = await apiRequest('/api/health-data');
        healthAssessmentData = response || {};
        saveToStorage(cacheKey, { data: healthAssessmentData, timestamp: Date.now() });
        updateRiskAssessment(healthAssessmentData);
    } catch (error) {
        console.error('Error loading health data:', error);
        showNotification('Failed to load health data', 'error');
    }
}

function updateRiskAssessment(data) {
    const riskAssessment = document.getElementById('riskAssessment');
    if (!riskAssessment || Object.keys(data).length === 0) return;
    
    const riskLevel = data.risk_level || 'Unknown';
    const riskColor = getRiskColor(riskLevel);
    
    let assessmentHTML = `
        <div class="risk-card ${riskLevel.toLowerCase()}" role="region" aria-label="Health Risk Assessment">
            <div class="risk-header">
                <div class="risk-icon">
                    <i class="fas fa-shield-alt" aria-hidden="true"></i>
                </div>
                <div class="risk-info">
                    <h3>Current Risk Level</h3>
                    <div class="risk-level ${riskLevel.toLowerCase()}">${riskLevel}</div>
                </div>
            </div>
            <div class="risk-details">
    `;
    
    const riskFactors = [];
    
    if (data.weight && data.height) {
        const bmi = calculateBMI(data.weight, data.height);
        if (bmi > 30) riskFactors.push('High BMI (Obesity)');
        else if (bmi > 25) riskFactors.push('Elevated BMI (Overweight)');
        else if (bmi < 18.5) riskFactors.push('Low BMI (Underweight)');
    }
    
    if (data.blood_pressure_systolic > 140) {
        riskFactors.push('High Blood Pressure');
    } else if (data.blood_pressure_systolic > 130) {
        riskFactors.push('Elevated Blood Pressure');
    }
    
    if (data.glucose_level > 140) {
        riskFactors.push('High Glucose Level');
    } else if (data.glucose_level > 126) {
        riskFactors.push('Elevated Glucose Level');
    }
    
    if (data.heart_rate > 100) {
        riskFactors.push('Elevated Heart Rate');
    } else if (data.heart_rate < 60) {
        riskFactors.push('Low Heart Rate');
    }
    
    if (riskFactors.length > 0) {
        assessmentHTML += `
            <div class="risk-factors">
                <h4>Identified Risk Factors:</h4>
                <ul>
                    ${riskFactors.map(factor => `<li>${sanitizeHTML(factor)}</li>`).join('')}
                </ul>
            </div>
        `;
    } else {
        assessmentHTML += `
            <div class="risk-factors">
                <p class="positive">No significant risk factors identified based on current data.</p>
            </div>
        `;
    }
    
    assessmentHTML += `
                <div class="risk-actions">
                    <button class="btn btn-primary" onclick="showDetailedHealthForm()" aria-label="Complete health assessment">
                        <i class="fas fa-plus" aria-hidden="true"></i>
                        Complete Assessment
                    </button>
                </div>
            </div>
        </div>
    `;
    
    riskAssessment.innerHTML = assessmentHTML;
}

function showDetailedHealthForm() {
    showModal('detailedHealthModal');
    populateDetailedForm();
}

function populateDetailedForm() {
    const form = document.getElementById('detailedHealthForm');
    if (!form || !healthAssessmentData) return;
    
    Object.keys(healthAssessmentData).forEach(key => {
        const field = form.elements[key];
        if (field && healthAssessmentData[key] !== null && healthAssessmentData[key] !== undefined) {
            field.value = sanitizeHTML(healthAssessmentData[key].toString());
        }
    });
}

async function handleDetailedHealthSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {};
    
    const numericFields = ['weight', 'height', 'body_temperature', 'blood_pressure_systolic', 
                          'blood_pressure_diastolic', 'heart_rate', 'respiratory_rate', 
                          'glucose_level', 'cholesterol', 'hemoglobin', 'sleep_hours'];
    
    for (let [key, value] of formData.entries()) {
        if (value.trim()) {
            if (numericFields.includes(key)) {
                data[key] = parseFloat(value);
            } else {
                data[key] = sanitizeHTML(value);
            }
        }
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.innerHTML = '<div class="spinner"></div> Saving Assessment...';
        submitBtn.disabled = true;
        
        const response = await apiRequest('/api/health-data', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (response.success) {
            showNotification(`Complete assessment saved! (+${response.points_earned || 0} points!)`, 'success');
            closeModal('detailedHealthModal');
            lazyLoadHealthData();
        } else {
            showNotification(response.message || 'Failed to save assessment', 'error');
        }
    } catch (error) {
        console.error('Error saving detailed health data:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function loadRecommendations() {
    const cacheKey = 'recommendations';
    const cacheExpiration = 15 * 60 * 1000;
    const cachedRecommendations = getFromStorage(cacheKey);
    
    if (cachedRecommendations && cachedRecommendations.timestamp && Date.now() - cachedRecommendations.timestamp < cacheExpiration) {
        displayRecommendations(cachedRecommendations.data);
        return;
    }
    
    // Simulate server-side recommendations (replace with actual API call)
    /* try {
        const response = await apiRequest('/api/recommendations', {
            method: 'POST',
            body: JSON.stringify(healthAssessmentData)
        });
        if (response.success) {
            displayRecommendations(response.recommendations);
            saveToStorage(cacheKey, { data: response.recommendations, timestamp: Date.now() });
        }
    } catch (error) {
        console.error('Error loading recommendations:', error);
        showNotification('Failed to load recommendations', 'error');
    } */
    
    // Fallback to client-side recommendations
    generateClientSideRecommendations();
}

function generateClientSideRecommendations() {
    if (Object.keys(healthAssessmentData).length === 0) return;
    
    const recommendations = {
        diet: [],
        exercise: [],
        lifestyle: []
    };
    
    if (healthAssessmentData.weight && healthAssessmentData.height) {
        const bmi = calculateBMI(healthAssessmentData.weight, healthAssessmentData.height);
        if (bmi > 25) {
            recommendations.diet.push('Focus on portion control and calorie reduction');
            recommendations.diet.push('Increase intake of lean proteins and vegetables');
            recommendations.diet.push('Limit processed foods and added sugars');
            recommendations.exercise.push('30-45 minutes of cardio exercise, 5 times per week');
            recommendations.exercise.push('Include strength training 2-3 times per week');
        } else if (bmi < 18.5) {
            recommendations.diet.push('Increase healthy caloric intake');
            recommendations.diet.push('Include protein-rich foods in every meal');
            recommendations.diet.push('Add healthy fats like nuts, seeds, and avocados');
            recommendations.exercise.push('Focus on strength training to build muscle mass');
        } else {
            recommendations.diet.push('Maintain balanced nutrition with varied foods');
            recommendations.exercise.push('Continue regular physical activity to maintain health');
        }
    }
    
    if (healthAssessmentData.blood_pressure_systolic > 130) {
        recommendations.diet.push('Reduce sodium intake to less than 2300mg per day');
        recommendations.diet.push('Increase potassium-rich foods (bananas, spinach, beans)');
        recommendations.lifestyle.push('Practice stress management techniques daily');
        recommendations.lifestyle.push('Ensure 7-8 hours of quality sleep each night');
    }
    
    if (healthAssessmentData.glucose_level > 100) {
        recommendations.diet.push('Choose low glycemic index foods');
        recommendations.diet.push('Limit refined carbohydrates and sugary drinks');
        recommendations.diet.push('Include fiber-rich foods to help stabilize blood sugar');
        recommendations.exercise.push('Take 10-15 minute walks after meals');
        recommendations.exercise.push('Include resistance training to improve insulin sensitivity');
    }
    
    if (healthAssessmentData.activity_level === 'sedentary') {
        recommendations.exercise.push('Start with 10-minute walks and gradually increase');
        recommendations.exercise.push('Take regular breaks from sitting every hour');
        recommendations.lifestyle.push('Use stairs instead of elevators when possible');
    }
    
    if (healthAssessmentData.sleep_hours && healthAssessmentData.sleep_hours < 7) {
        recommendations.lifestyle.push('Aim for 7-9 hours of sleep per night');
        recommendations.lifestyle.push('Establish a consistent bedtime routine');
        recommendations.lifestyle.push('Limit screen time 1 hour before bed');
    }
    
    if (healthAssessmentData.smoking_status === 'current') {
        recommendations.lifestyle.push('Consider a smoking cessation program');
        recommendations.lifestyle.push('Increase antioxidant-rich foods in your diet');
        recommendations.exercise.push('Start with low-intensity exercises to improve lung function');
    }
    
    if (healthAssessmentData.alcohol_intake === 'daily') {
        recommendations.lifestyle.push('Consider reducing alcohol consumption');
        recommendations.lifestyle.push('Stay hydrated with water throughout the day');
    }
    
    if (recommendations.diet.length === 0) {
        recommendations.diet.push('Eat a variety of colorful fruits and vegetables');
        recommendations.diet.push('Include whole grains and lean proteins');
        recommendations.diet.push('Stay hydrated with 8 glasses of water daily');
    }
    
    if (recommendations.exercise.length === 0) {
        recommendations.exercise.push('Aim for 150 minutes of moderate exercise per week');
        recommendations.exercise.push('Include both cardio and strength training');
        recommendations.exercise.push('Find activities you enjoy to stay motivated');
    }
    
    if (recommendations.lifestyle.length === 0) {
        recommendations.lifestyle.push('Practice mindfulness or meditation regularly');
        recommendations.lifestyle.push('Maintain social connections and relationships');
        recommendations.lifestyle.push('Schedule regular health check-ups');
    }
    
    saveToStorage('recommendations', { data: recommendations, timestamp: Date.now() });
    displayRecommendations(recommendations);
}

function displayRecommendations(recommendations) {
    Object.keys(recommendations).forEach(type => {
        const container = document.getElementById(`${type}Recommendations`);
        if (container && recommendations[type].length > 0) {
            container.innerHTML = `
                <div class="recommendations-list" role="list">
                    ${recommendations[type].map(rec => `
                        <div class="recommendation-item" role="listitem">
                            <div class="recommendation-icon">
                                <i class="fas fa-check-circle" aria-hidden="true"></i>
                            </div>
                            <div class="recommendation-text">${sanitizeHTML(rec)}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (container) {
            container.innerHTML = `
                <div class="recommendation-placeholder">
                    <i class="fas ${type === 'diet' ? 'fa-utensils' : type === 'exercise' ? 'fa-dumbbell' : 'fa-leaf'}" aria-hidden="true"></i>
                    <p>Complete your health assessment to get personalized ${type} recommendations</p>
                </div>
            `;
        }
    });
}

function showTab(tabName) {
    currentSection = tabName;
    
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });
    event.target.classList.add('active');
    event.target.setAttribute('aria-selected', 'true');
    
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
        pane.setAttribute('aria-hidden', 'true');
    });
    
    const targetPane = document.getElementById(`${tabName}Tab`);
    if (targetPane) {
        targetPane.classList.add('active');
        targetPane.setAttribute('aria-hidden', 'false');
    }
}

async function analyzeSymptoms() {
    const symptomsInput = document.getElementById('symptomsInput');
    const symptoms = symptomsInput.value.trim();
    
    if (!symptoms) {
        showNotification('Please describe your symptoms', 'warning');
        return;
    }
    
    const resultsContainer = document.getElementById('symptomResults');
    const analysisContent = resultsContainer.querySelector('.analysis-content');
    
    analysisContent.innerHTML = `
        <div class="loading-analysis">
            <div class="spinner"></div>
            <p>Analyzing your symptoms...</p>
        </div>
    `;
    resultsContainer.style.display = 'block';
    
    try {
        const response = await apiRequest('/api/chat', {
            method: 'POST',
            body: JSON.stringify({
                message: `Please analyze these symptoms and provide health insights: ${sanitizeHTML(symptoms)}`
            })
        });
        
        if (response.success) {
            analysisContent.innerHTML = `
                <div class="symptom-analysis" role="region" aria-label="Symptom Analysis">
                    <h4><i class="fas fa-stethoscope" aria-hidden="true"></i> AI Health Analysis</h4>
                    <div class="analysis-text">${formatSymptomAnalysis(response.response)}</div>
                    <div class="analysis-disclaimer">
                        <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
                        <strong>Important:</strong> This analysis is for informational purposes only. 
                        Please consult a healthcare professional for proper medical diagnosis and treatment.
                    </div>
                </div>
            `;
        } else {
            throw new Error(response.message || 'Failed to analyze symptoms');
        }
    } catch (error) {
        console.error('Error analyzing symptoms:', error);
        analysisContent.innerHTML = `
            <div class="analysis-error">
                <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
                <p>Sorry, I couldn't analyze your symptoms right now. Please try again later or consult a healthcare professional.</p>
            </div>
        `;
    }
}

function formatSymptomAnalysis(analysis) {
    let formatted = sanitizeHTML(analysis)
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
    return formatted;
}

function clearSymptoms() {
    const symptomsInput = document.getElementById('symptomsInput');
    const resultsContainer = document.getElementById('symptomResults');
    
    if (symptomsInput) symptomsInput.value = '';
    if (resultsContainer) resultsContainer.style.display = 'none';
}

function setupFileUpload() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFiles(files);
    }
}

function handleFileUpload(event) {
    const files = event.target.files;
    if (files.length > 0) {
        processFiles(files);
    }
}

function processFiles(files) {
    const uploadedFilesContainer = document.getElementById('uploadedFiles');
    
    Array.from(files).forEach(file => {
        if (validateFile(file)) {
            displayUploadedFile(file, uploadedFilesContainer);
            simulateFileAnalysis(file);
        }
    });
}

function validateFile(file) {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 16 * 1024 * 1024;
    
    if (!allowedTypes.includes(file.type)) {
        showNotification('Only PDF, JPG, and PNG files are allowed', 'error');
        return false;
    }
    
    if (file.size > maxSize) {
        showNotification('File size must be less than 16MB', 'error');
        return false;
    }
    
    return true;
}

function displayUploadedFile(file, container) {
    const fileElement = document.createElement('div');
    fileElement.className = 'uploaded-file';
    fileElement.setAttribute('role', 'listitem');
    fileElement.innerHTML = `
        <div class="file-info">
            <div class="file-icon">
                <i class="fas ${file.type.includes('pdf') ? 'fa-file-pdf' : 'fa-file-image'}" aria-hidden="true"></i>
            </div>
            <div class="file-details">
                <div class="file-name">${sanitizeHTML(file.name)}</div>
                <div class="file-size">${formatFileSize(file.size)}</div>
                <div class="file-status">Processing...</div>
            </div>
        </div>
        <div class="file-actions">
            <button class="btn btn-secondary btn-small" onclick="removeFile(this)" aria-label="Remove file">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
        </div>
    `;
    
    container.appendChild(fileElement);
}

function simulateFileAnalysis(file) {
    setTimeout(() => {
        const fileElements = document.querySelectorAll('.uploaded-file');
        const lastFile = fileElements[fileElements.length - 1];
        const statusElement = lastFile.querySelector('.file-status');
        
        statusElement.innerHTML = `
            <div class="analysis-complete">
                <i class="fas fa-check-circle" aria-hidden="true"></i>
                Analysis complete
            </div>
        `;
        showNotification('Medical report analysis completed', 'success');
    }, 3000);
}

function removeFile(button) {
    const fileElement = button.closest('.uploaded-file');
    fileElement.remove();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function calculateBMI(weight, height) {
    const heightInM = parseFloat(height) / 100;
    return parseFloat(weight) / (heightInM * heightInM);
}

function getRiskColor(riskLevel) {
    const colors = {
        'Low': 'var(--success-color)',
        'Medium': 'var(--warning-color)',
        'High': 'var(--error-color)'
    };
    return colors[riskLevel] || 'var(--gray-500)';
}

// Add CSS for assistant styling
const style = document.createElement('style');
style.textContent = `
.assistant-page {
    padding: 2rem 0;
}

.assistant-header {
    margin-bottom: 3rem;
}

.assistant-intro {
    display: flex;
    align-items: center;
    gap: 2rem;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    color: var(--white);
    padding: 2rem;
    border-radius: var(--border-radius);
}

.assistant-icon {
    width: 4rem;
    height: 4rem;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    flex-shrink: 0;
}

.assistant-text h1 {
    color: var(--white);
    margin-bottom: 0.5rem;
}

.assistant-text p {
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
}

.assistant-sections {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.assistant-section {
    background: var(--white);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    overflow: hidden;
}

.section-header {
    background: var(--gray-50);
    padding: 1.5rem 2rem;
    border-bottom: 1px solid var(--gray-200);
}

.section-header h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    color: var(--gray-900);
}

.section-header i {
    color: var(--primary-color);
}

.section-content {
    padding: 2rem;
}

.quick-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.metric-input label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: var(--gray-700);
}

.metric-input input,
.bp-inputs {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--gray-200);
    border-radius: var(--border-radius);
    transition: var(--transition);
}

.metric-input input:focus {
    border-color: var(--primary-color);
    outline: none;
    box-shadow: 0 0 0 3px var(--primary-light);
}

.bp-inputs {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0;
    border: none;
}

.bp-inputs input {
    flex: 1;
    margin: 0;
}

.bp-inputs span {
    font-weight: bold;
    color: var(--gray-600);
}

.section-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.risk-card {
    border-radius: var(--border-radius);
    padding: 1.5rem;
    border-left: 4px solid;
}

.risk-card.low {
    background: #F0FDF4;
    border-left-color: var(--success-color);
}

.risk-card.medium {
    background: #FFFBEB;
    border-left-color: var(--warning-color);
}

.risk-card.high {
    background: #FEF2F2;
    border-left-color: var(--error-color);
}

.risk-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.risk-icon {
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
}

.risk-card.low .risk-icon {
    background: var(--success-color);
    color: var(--white);
}

.risk-card.medium .risk-icon {
    background: var(--warning-color);
    color: var(--white);
}

.risk-card.high .risk-icon {
    background: var(--error-color);
    color: var(--white);
}

.risk-info h3 {
    margin: 0 0 0.25rem 0;
    color: var(--gray-900);
}

.risk-level {
    font-size: 1.25rem;
    font-weight: 700;
}

.risk-level.low {
    color: var(--success-color);
}

.risk-level.medium {
    color: var(--warning-color);
}

.risk-level.high {
    color: var(--error-color);
}

.risk-factors h4 {
    margin-bottom: 0.5rem;
    color: var(--gray-800);
}

.risk-factors ul {
    margin: 0;
    padding-left: 1.5rem;
}

.risk-factors li {
    margin-bottom: 0.25rem;
    color: var(--gray-700);
}

.positive {
    color: var(--success-color);
    font-weight: 600;
}

.risk-actions {
    margin-top: 1rem;
}

.recommendations-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--gray-200);
}

.tab-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    border: none;
    background: none;
    color: var(--gray-600);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: var(--transition);
    font-weight: 500;
}

.tab-button:hover {
    color: var(--primary-color);
    background: var(--primary-light);
}

.tab-button.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
    background: var(--primary-light);
}

.tab-content {
    position: relative;
}

.tab-pane {
    display: none;
}

.tab-pane.active {
    display: block;
}

.recommendations-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.recommendation-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--gray-50);
    border-radius: var(--border-radius);
    border-left: 4px solid var(--primary-color);
}

.recommendation-icon {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--primary-light);
    color: var(--primary-color);
}

.recommendation-text {
    flex: 1;
    color: var(--gray-800);
}

.recommendation-placeholder {
    text-align: center;
    padding: 2rem;
    color: var(--gray-600);
}

.recommendation-placeholder i {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: var(--primary-color);
}

.upload-area {
    border: 2px dashed var(--gray-300);
    border-radius: var(--border-radius);
    padding: 2rem;
    text-align: center;
    transition: var(--transition);
    cursor: pointer;
}

.upload-area.drag-over {
    background: var(--primary-light);
    border-color: var(--primary-color);
}

.upload-area i {
    font-size: 2rem;
    color: var(--primary-color);
    margin-bottom: 1rem;
}

.upload-area p {
    margin: 0.5rem 0;
    color: var(--gray-600);
}

.upload-area input[type="file"] {
    display: none;
}

.uploaded-files {
    margin-top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.uploaded-file {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--gray-50);
    border-radius: var(--border-radius);
    border-left: 4px solid var(--primary-color);
}

.file-info {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.file-icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--primary-light);
    color: var(--primary-color);
}

.file-details {
    flex: 1;
}

.file-name {
    font-weight: 600;
    color: var(--gray-800);
}

.file-size {
    color: var(--gray-600);
    font-size: 0.9rem;
}

.file-status {
    color: var(--gray-600);
    font-size: 0.9rem;
}

.analysis-complete {
    color: var(--success-color);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.file-actions button {
    padding: 0.5rem;
}

.symptom-checker {
    margin-top: 2rem;
}

.symptom-input {
    position: relative;
}

.symptom-input textarea {
    width: 100%;
    min-height: 100px;
    padding: 1rem;
    border: 2px solid var(--gray-200);
    border-radius: var(--border-radius);
    resize: vertical;
    transition: var(--transition);
}

.symptom-input textarea:focus {
    border-color: var(--primary-color);
    outline: none;
    box-shadow: 0 0 0 3px var(--primary-light);
}

.symptom-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    flex-wrap: wrap;
}

.symptom-results {
    display: none;
    margin-top: 1.5rem;
    padding: 1.5rem;
    background: var(--gray-50);
    border-radius: var(--border-radius);
    border-left: 4px solid var(--primary-color);
}

.loading-analysis {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: var(--gray-600);
}

.loading-analysis .spinner {
    width: 1.5rem;
    height: 1.5rem;
}

.symptom-analysis h4 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    color: var(--gray-900);
}

.analysis-text {
    color: var(--gray-800);
    line-height: 1.6;
}

.analysis-disclaimer {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--warning-light);
    border-radius: var(--border-radius);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--gray-800);
}

.analysis-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--error-color);
}

@media (max-width: 768px) {
    .quick-metrics {
        grid-template-columns: 1fr;
    }
    
    .assistant-intro {
        flex-direction: column;
        text-align: center;
    }
    
    .recommendations-tabs {
        flex-direction: column;
        align-items: stretch;
    }
    
    .tab-button {
        padding: 1rem;
        border-bottom: none;
        border-left: 2px solid transparent;
    }
    
    .tab-button.active {
        border-bottom: none;
        border-left-color: var(--primary-color);
    }
}

@media (max-width: 480px) {
    .section-content {
        padding: 1.5rem;
    }
    
    .risk-card {
        padding: 1rem;
    }
    
    .recommendation-item {
        flex-direction: column;
        text-align: center;
    }
    
    .recommendation-icon {
        margin-bottom: 0.5rem;
    }
}
`;

document.head.appendChild(style);
