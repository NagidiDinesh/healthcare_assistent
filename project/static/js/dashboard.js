// Dashboard JavaScript functionality

let healthChart = null;
let trendChart = null;
let currentHealthData = {};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

function initializeDashboard() {
    loadUserProfile();
    setupEventListeners();
    // Lazy load health data and charts
    lazyLoadHealthData();
}

function setupEventListeners() {
    // Health data form submission
    const healthForm = document.getElementById('healthDataForm');
    if (healthForm) {
        healthForm.addEventListener('submit', handleHealthDataSubmit);
    }
    
    // Profile form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }
    
    // Modal triggers
    document.addEventListener('click', function(e) {
        if (e.target.matches('[onclick*="showHealthDataForm"]')) {
            e.preventDefault();
            showHealthDataForm();
        }
        if (e.target.matches('[onclick*="showProfileForm"]')) {
            e.preventDefault();
            showProfileForm();
        }
    });
}

// Load User Profile with caching
async function loadUserProfile() {
    const cacheKey = 'user_profile';
    const cacheExpiration = 15 * 60 * 1000; // 15 minutes
    const cachedProfile = getFromStorage(cacheKey);
    
    if (cachedProfile && cachedProfile.timestamp && Date.now() - cachedProfile.timestamp < cacheExpiration) {
        displayUserProfile(cachedProfile.data);
        populateProfileForm(cachedProfile.data);
        return;
    }
    
    try {
        const response = await apiRequest('/api/user/profile');
        if (response) {
            saveToStorage(cacheKey, { data: response, timestamp: Date.now() });
            displayUserProfile(response);
            populateProfileForm(response);
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        showNotification('Failed to load profile information', 'error');
    }
}

function displayUserProfile(profile) {
    const profileCard = document.getElementById('profileCard');
    if (!profileCard) return;
    
    profileCard.innerHTML = `
        <div class="profile-info" role="region" aria-label="User Profile">
            <div class="profile-avatar">
                <i class="fas fa-user-circle" aria-hidden="true"></i>
            </div>
            <div class="profile-details">
                <h3>${profile.name}</h3>
                <p><i class="fas fa-envelope" aria-hidden="true"></i> ${profile.email}</p>
                <p><i class="fas fa-phone" aria-hidden="true"></i> ${profile.phone}</p>
                <p><i class="fas fa-birthday-cake" aria-hidden="true"></i> ${profile.age} years old</p>
                <p><i class="fas fa-venus-mars" aria-hidden="true"></i> ${profile.gender}</p>
                <div class="profile-stats">
                    <div class="stat">
                        <span class="stat-value">${profile.points || 0}</span>
                        <span class="stat-label">Health Points</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${formatDate(profile.created_at)}</span>
                        <span class="stat-label">Member Since</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function populateProfileForm(profile) {
    const form = document.getElementById('profileForm');
    if (!form) return;
    
    form.elements.name.value = profile.name || '';
    form.elements.age.value = profile.age || '';
    form.elements.phone.value = profile.phone || '';
}

// Lazy Load Health Data
function lazyLoadHealthData() {
    const chartsContainer = document.getElementById('chartsContainer');
    if (!chartsContainer) return;
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadHealthData();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    observer.observe(chartsContainer);
}

// Load Health Data with caching
async function loadHealthData() {
    const cacheKey = 'health_data';
    const cacheExpiration = 15 * 60 * 1000; // 15 minutes
    const cachedHealthData = getFromStorage(cacheKey);
    
    if (cachedHealthData && cachedHealthData.timestamp && Date.now() - cachedHealthData.timestamp < cacheExpiration) {
        currentHealthData = cachedHealthData.data;
        displayHealthMetrics(currentHealthData);
        populateHealthDataForm(currentHealthData);
        createHealthCharts(currentHealthData);
        return;
    }
    
    try {
        const response = await apiRequest('/api/health-data');
        currentHealthData = response || {};
        saveToStorage(cacheKey, { data: currentHealthData, timestamp: Date.now() });
        displayHealthMetrics(currentHealthData);
        populateHealthDataForm(currentHealthData);
        createHealthCharts(currentHealthData);
    } catch (error) {
        console.error('Error loading health data:', error);
        showNotification('Failed to load health data', 'error');
    }
}

function displayHealthMetrics(data) {
    const metricsGrid = document.getElementById('metricsGrid');
    if (!metricsGrid) return;
    
    const metrics = [];
    
    // Basic metrics
    if (data.weight && data.height) {
        const bmi = calculateBMI(data.weight, data.height);
        metrics.push({
            title: 'BMI',
            value: bmi.toFixed(1),
            unit: 'kg/m²',
            icon: 'fa-weight',
            status: getBMIStatus(bmi)
        });
    }
    
    if (data.blood_pressure_systolic) {
        metrics.push({
            title: 'Blood Pressure',
            value: `${data.blood_pressure_systolic}/${data.blood_pressure_diastolic || 80}`,
            unit: 'mmHg',
            icon: 'fa-heartbeat',
            status: getBPStatus(data.blood_pressure_systolic)
        });
    }
    
    if (data.heart_rate) {
        metrics.push({
            title: 'Heart Rate',
            value: data.heart_rate,
            unit: 'bpm',
            icon: 'fa-heart',
            status: getHeartRateStatus(data.heart_rate)
        });
    }
    
    if (data.glucose_level) {
        metrics.push({
            title: 'Glucose Level',
            value: data.glucose_level,
            unit: 'mg/dL',
            icon: 'fa-tint',
            status: getGlucoseStatus(data.glucose_level)
        });
    }
    
    if (data.body_temperature) {
        metrics.push({
            title: 'Body Temperature',
            value: data.body_temperature,
            unit: '°F',
            icon: 'fa-thermometer-half',
            status: getTemperatureStatus(data.body_temperature)
        });
    }
    
    if (data.risk_level) {
        metrics.push({
            title: 'Risk Level',
            value: data.risk_level,
            unit: '',
            icon: 'fa-shield-alt',
            status: data.risk_level.toLowerCase()
        });
    }
    
    // Render metrics
    metricsGrid.innerHTML = metrics.map(metric => `
        <div class="metric-card ${metric.status}" role="region" aria-label="${metric.title} metric">
            <div class="metric-header">
                <div class="metric-icon">
                    <i class="fas ${metric.icon}" aria-hidden="true"></i>
                </div>
                <h3>${metric.title}</h3>
            </div>
            <div class="metric-value">
                ${metric.value}
                ${metric.unit ? `<span class="unit">${metric.unit}</span>` : ''}
            </div>
            <div class="metric-status ${metric.status}">
                ${getStatusText(metric.status)}
            </div>
        </div>
    `).join('');
}

function populateHealthDataForm(data) {
    const form = document.getElementById('healthDataForm');
    if (!form) return;
    
    Object.keys(data).forEach(key => {
        const field = form.elements[key];
        if (field && data[key] !== null && data[key] !== undefined) {
            field.value = data[key];
        }
    });
}

// Health Data Form
function showHealthDataForm() {
    showModal('healthDataModal');
    populateHealthDataForm(currentHealthData);
}

async function handleHealthDataSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {};
    
    // Convert form data to object, filtering out empty values
    for (let [key, value] of formData.entries()) {
        if (value.trim()) {
            if (['weight', 'height', 'blood_pressure_systolic', 'blood_pressure_diastolic', 
                 'heart_rate', 'glucose_level', 'body_temperature', 'sleep_hours'].includes(key)) {
                data[key] = parseFloat(value);
            } else {
                data[key] = value;
            }
        }
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.innerHTML = '<div class="spinner"></div> Saving...';
        submitBtn.disabled = true;
        
        const response = await apiRequest('/api/health-data', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (response.success) {
            showNotification(`${response.message}${response.points_earned ? ` (+${response.points_earned} points!)` : ''}`, 'success');
            closeModal('healthDataModal');
            loadHealthData(); // Reload to show updated data
            loadUserProfile(); // Reload to show updated points
        } else {
            showNotification(response.message || 'Failed to save health data', 'error');
        }
    } catch (error) {
        console.error('Error saving health data:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Profile Form
function showProfileForm() {
    showModal('profileModal');
    loadUserProfile();
}

async function handleProfileSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Remove empty password fields
    if (!data.current_password) {
        delete data.current_password;
        delete data.new_password;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.innerHTML = '<div class="spinner"></div> Updating...';
        submitBtn.disabled = true;
        
        const response = await apiRequest('/api/user/profile', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (response.success) {
            showNotification(response.message, 'success');
            closeModal('profileModal');
            loadUserProfile(); // Reload to show updated data
        } else {
            showNotification(response.message || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Chart Creation with Accessibility
function createHealthCharts(data) {
    createBloodPressureChart(data);
    createWeightChart(data);
}

function createBloodPressureChart(data) {
    const ctx = document.getElementById('bpChart');
    if (!ctx || !data.blood_pressure_systolic) return;
    
    // Destroy existing chart
    if (healthChart) {
        healthChart.destroy();
    }
    
    // Generate sample trend data (replace with server-side historical data in production)
    const dates = [];
    const systolicData = [];
    const diastolicData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toLocaleDateString());
        const variation = (Math.random() - 0.5) * 20;
        systolicData.push(Math.max(90, parseInt(data.blood_pressure_systolic) + variation));
        diastolicData.push(Math.max(60, parseInt(data.blood_pressure_diastolic || 80) + variation * 0.7));
    }
    
    ctx.setAttribute('aria-label', 'Blood Pressure Trend Chart for Last 7 Days');
    ctx.setAttribute('role', 'img');
    
    healthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Systolic',
                data: systolicData,
                borderColor: '#EF4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4
            }, {
                label: 'Diastolic',
                data: diastolicData,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Blood Pressure Trend (Last 7 Days)'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y} mmHg`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'mmHg'
                    }
                }
            },
            aria: {
                describedBy: 'bpChartDescription'
            }
        }
    });
    
    // Add chart description for accessibility
    const description = document.createElement('div');
    description.id = 'bpChartDescription';
    description.style.display = 'none';
    description.textContent = 'Line chart showing systolic and diastolic blood pressure trends over the last 7 days, measured in mmHg.';
    ctx.parentNode.appendChild(description);
}

function createWeightChart(data) {
    const ctx = document.getElementById('weightChart');
    if (!ctx || !data.weight) return;
    
    // Destroy existing chart
    if (trendChart) {
        trendChart.destroy();
    }
    
    // Generate sample trend data
    const dates = [];
    const weightData = [];
    const bmiData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toLocaleDateString());
        const variation = (Math.random() - 0.5) * 4;
        const weight = Math.max(30, parseFloat(data.weight) + variation);
        weightData.push(weight);
        if (data.height) {
            const height = parseFloat(data.height) / 100;
            bmiData.push(weight / (height * height));
        }
    }
    
    ctx.setAttribute('aria-label', 'Weight and BMI Trend Chart for Last 7 Days');
    ctx.setAttribute('role', 'img');
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Weight (kg)',
                data: weightData,
                borderColor: '#22C55E',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                yAxisID: 'y',
                tension: 0.4
            }, {
                label: 'BMI',
                data: bmiData,
                borderColor: '#A855F7',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                yAxisID: 'y1',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Weight & BMI Trend (Last 7 Days)'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y} ${context.dataset.label === 'Weight (kg)' ? 'kg' : 'kg/m²'}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Weight (kg)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'BMI'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            },
            aria: {
                describedBy: 'weightChartDescription'
            }
        }
    });
    
    // Add chart description for accessibility
    const description = document.createElement('div');
    description.id = 'weightChartDescription';
    description.style.display = 'none';
    description.textContent = 'Line chart showing weight and BMI trends over the last 7 days, with weight in kilograms and BMI in kg/m².';
    ctx.parentNode.appendChild(description);
}

// Helper Functions
function calculateBMI(weight, height) {
    const heightInM = parseFloat(height) / 100;
    return parseFloat(weight) / (heightInM * heightInM);
}

function getBMIStatus(bmi) {
    if (bmi < 18.5) return 'low';
    if (bmi < 25) return 'normal';
    if (bmi < 30) return 'medium';
    return 'high';
}

function getBPStatus(systolic) {
    if (systolic < 90) return 'low';
    if (systolic < 120) return 'normal';
    if (systolic < 140) return 'medium';
    return 'high';
}

function getHeartRateStatus(rate) {
    if (rate < 60) return 'low';
    if (rate < 100) return 'normal';
    return 'high';
}

function getGlucoseStatus(glucose) {
    if (glucose < 70) return 'low';
    if (glucose < 100) return 'normal';
    if (glucose < 126) return 'medium';
    return 'high';
}

function getTemperatureStatus(temp) {
    if (temp < 97) return 'low';
    if (temp < 99.5) return 'normal';
    if (temp < 101) return 'medium';
    return 'high';
}

function getStatusText(status) {
    const statusTexts = {
        'low': 'Low',
        'normal': 'Normal',
        'medium': 'Elevated',
        'high': 'High'
    };
    return statusTexts[status] || status;
}

// Add CSS for metric cards (unchanged from original)
const style = document.createElement('style');
style.textContent = `
.metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.metric-card {
    background: var(--white);
    border-radius: var(--border-radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
    transition: var(--transition);
    border-left: 4px solid var(--gray-300);
}

.metric-card:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
}

.metric-card.normal {
    border-left-color: var(--success-color);
}

.metric-card.low {
    border-left-color: var(--warning-color);
}

.metric-card.medium {
    border-left-color: var(--warning-color);
}

.metric-card.high {
    border-left-color: var(--error-color);
}

.metric-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.metric-icon {
    width: 3rem;
    height: 3rem;
    background: var(--gray-100);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: var(--gray-600);
}

.metric-card.normal .metric-icon {
    background: var(--secondary-light);
    color: var(--success-color);
}

.metric-card.low .metric-icon,
.metric-card.medium .metric-icon {
    background: #FEF3C7;
    color: var(--warning-color);
}

.metric-card.high .metric-icon {
    background: #FEE2E2;
    color: var(--error-color);
}

.metric-header h3 {
    margin: 0;
    font-size: 1rem;
    color: var(--gray-700);
}

.metric-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--gray-900);
    margin-bottom: 0.5rem;
}

.metric-value .unit {
    font-size: 0.875rem;
    font-weight: 400;
    color: var(--gray-500);
    margin-left: 0.25rem;
}

.metric-status {
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.metric-status.normal {
    color: var(--success-color);
}

.metric-status.low,
.metric-status.medium {
    color: var(--warning-color);
}

.metric-status.high {
    color: var(--error-color);
}

.dashboard-actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
}

.dashboard-section {
    background: var(--white);
    border-radius: var(--border-radius);
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: var(--shadow);
}

.dashboard-section h2 {
    margin-bottom: 1.5rem;
    color: var(--gray-900);
    border-bottom: 2px solid var(--primary-color);
    padding-bottom: 0.5rem;
}

.charts-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 2rem;
}

.chart-card {
    background: var(--gray-50);
    border-radius: var(--border-radius);
    padding: 1.5rem;
    border: 1px solid var(--gray-200);
}

.chart-card h3 {
    margin-bottom: 1rem;
    color: var(--gray-700);
    text-align: center;
}

.profile-info {
    display: flex;
    gap: 1.5rem;
    align-items: center;
}

.profile-avatar {
    font-size: 4rem;
    color: var(--primary-color);
}

.profile-details h3 {
    margin-bottom: 0.5rem;
    color: var(--gray-900);
}

.profile-details p {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    color: var(--gray-600);
}

.profile-details i {
    width: 1rem;
    color: var(--gray-400);
}

.profile-stats {
    display: flex;
    gap: 2rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--gray-200);
}

.stat {
    text-align: center;
}

.stat-value {
    display: block;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--primary-color);
}

.stat-label {
    font-size: 0.875rem;
    color: var(--gray-500);
}

.form-section {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--gray-200);
}

.form-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
}

.form-section h4 {
    color: var(--gray-800);
    margin-bottom: 1rem;
    font-size: 1.125rem;
}

@media (max-width: 768px) {
    .metrics-grid {
        grid-template-columns: 1fr;
    }
    
    .charts-container {
        grid-template-columns: 1fr;
    }
    
    .dashboard-actions {
        flex-direction: column;
    }
    
    .profile-info {
        flex-direction: column;
        text-align: center;
    }
    
    .profile-stats {
        justify-content: center;
    }
}
`;
document.head.appendChild(style);

// Chart.js Dependency (loaded dynamically)
function loadChartJs(callback) {
    if (window.Chart) {
        callback();
        return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
    script.onload = callback;
    script.onerror = () => showNotification('Failed to load charting library', 'error');
    document.head.appendChild(script);
}

// Initialize charts after Chart.js is loaded
loadChartJs(() => {
    if (currentHealthData && Object.keys(currentHealthData).length > 0) {
        createHealthCharts(currentHealthData);
    }
});