// Main JavaScript functionality

// Global variables
let notificationTimeout = null;
let currentUser = null;

// Sanitize HTML to prevent XSS
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// DOM Content Loaded Event
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize Application
function initializeApp() {
    // Setup event listeners
    setupNavigation();
    setupNotifications();
    
    // Initialize components based on page
    const currentPage = getCurrentPage();
    initializePageSpecificFeatures(currentPage);
    
    // Setup common functionality
    setupFormValidation();
    setupAccessibility();
}

// Get current page identifier
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('home')) return 'home';
    if (path.includes('dashboard')) return 'dashboard';
    if (path.includes('chat')) return 'chat';
    if (path.includes('assistant')) return 'assistant';
    if (path.includes('login')) return 'login';
    if (path.includes('signup')) return 'signup';
    return 'landing';
}

// Initialize page-specific features
function initializePageSpecificFeatures(page) {
    switch (page) {
        case 'home':
            initializeHomePage();
            break;
        case 'dashboard':
            initializeDashboard();
            break;
        case 'chat':
            initializeChat();
            break;
        case 'assistant':
            initializeAssistant();
            break;
        case 'login':
        case 'signup':
            initializeAuthPages();
            break;
        default:
            initializeLandingPage();
    }
}

// Navigation Setup
function setupNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (navToggle && navLinks) {
        navToggle.setAttribute('aria-label', 'Toggle navigation menu');
        navToggle.setAttribute('role', 'button');
        navLinks.setAttribute('role', 'navigation');
        
        navToggle.addEventListener('click', function() {
            const isActive = navLinks.classList.toggle('active');
            navToggle.classList.toggle('active');
            navToggle.setAttribute('aria-expanded', isActive);
        });
        
        // Close nav when clicking outside
        document.addEventListener('click', function(e) {
            if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
                navToggle.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
    
    // Add scroll effect to navbar
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });
}

// Notification System
function setupNotifications() {
    if (!document.getElementById('notification')) {
        const notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        notification.setAttribute('role', 'alert');
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message"></span>
                <button class="notification-close" onclick="hideNotification()" aria-label="Close notification">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
        `;
        document.body.appendChild(notification);
    }
}

function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.getElementById('notification');
    const messageElement = notification.querySelector('.notification-message');
    
    if (notification && messageElement) {
        if (notificationTimeout) {
            clearTimeout(notificationTimeout);
        }
        
        // Sanitize message
        messageElement.innerHTML = sanitizeHTML(message);
        notification.className = `notification ${type}`;
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        if (duration > 0) {
            notificationTimeout = setTimeout(() => {
                hideNotification();
            }, duration);
        }
    }
}

function hideNotification() {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.classList.remove('show');
        if (notificationTimeout) {
            clearTimeout(notificationTimeout);
            notificationTimeout = null;
        }
    }
}

// Modal System
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
        const firstInput = modal.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
        e.target.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal.show');
        if (openModal) {
            openModal.classList.remove('show');
            openModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    }
});

// Form Validation Setup
function setupFormValidation() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.setAttribute('role', 'form');
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', validateField);
            input.addEventListener('input', clearFieldError);
        });
    });
}

function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    
    clearFieldError(e);
    
    if (field.hasAttribute('required') && !value) {
        showFieldError(field, 'This field is required');
        return false;
    }
    
    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            showFieldError(field, 'Please enter a valid email address');
            return false;
        }
    }
    
    if (field.type === 'tel' && value) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
            showFieldError(field, 'Please enter a valid phone number');
            return false;
        }
    }
    
    if (field.type === 'password' && field.name === 'password' && value) {
        if (value.length < 6) {
            showFieldError(field, 'Password must be at least 6 characters long');
            return false;
        }
    }
    
    return true;
}

function showFieldError(field, message) {
    const formGroup = field.closest('.form-group');
    if (formGroup) {
        const existingError = formGroup.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.style.color = 'var(--error-color)';
        errorElement.style.fontSize = '0.875rem';
        errorElement.style.marginTop = '0.25rem';
        errorElement.textContent = message;
        errorElement.setAttribute('role', 'alert');
        
        formGroup.appendChild(errorElement);
        field.style.borderColor = 'var(--error-color)';
        field.setAttribute('aria-invalid', 'true');
    }
}

function clearFieldError(e) {
    const field = e.target;
    const formGroup = field.closest('.form-group');
    if (formGroup) {
        const errorElement = formGroup.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
        field.style.borderColor = '';
        field.removeAttribute('aria-invalid');
    }
}

// Password Toggle Functionality
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const button = field.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.className = 'fas fa-eye-slash';
        button.setAttribute('aria-label', 'Hide password');
    } else {
        field.type = 'password';
        icon.className = 'fas fa-eye';
        button.setAttribute('aria-label', 'Show password');
    }
}

// Accessibility Setup
function setupAccessibility() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 6px;
        background: var(--primary-color);
        color: white;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 1000;
    `;
    
    skipLink.addEventListener('focus', function() {
        this.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', function() {
        this.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    const buttons = document.querySelectorAll('button:not([aria-label])');
    buttons.forEach(button => {
        if (!button.textContent.trim()) {
            const icon = button.querySelector('i');
            if (icon) {
                if (icon.classList.contains('fa-times')) {
                    button.setAttribute('aria-label', 'Close');
                } else if (icon.classList.contains('fa-search')) {
                    button.setAttribute('aria-label', 'Search');
                } else if (icon.classList.contains('fa-menu')) {
                    button.setAttribute('aria-label', 'Menu');
                }
            }
        }
    });
}

// Utility Functions
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function formatNumber(num, decimals = 1) {
    return parseFloat(num).toFixed(decimals);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// API Helper Functions
async function apiRequest(url, options = {}) {
    const defaults = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    const config = { ...defaults, ...options };
    
    try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// Local Storage Helpers
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
}

function getFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return defaultValue;
    }
}

function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removing from localStorage:', error);
        return false;
    }
}

// Initialize page-specific functionality (placeholders)
function initializeLandingPage() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}

function initializeHomePage() {
    console.log('Initializing Home Page');
}

function initializeDashboard() {
    console.log('Initializing Dashboard');
}

function initializeChat() {
    console.log('Initializing Chat');
}

function initializeAssistant() {
    console.log('Initializing Assistant');
}

function initializeAuthPages() {
    console.log('Initializing Auth Pages');
}

// Error Handling
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showNotification('An unexpected error occurred. Please try again.', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    showNotification('A network error occurred. Please check your connection.', 'error');
});

// Memory Management Instructions
function handleMemoryForgetRequest() {
    showNotification('To forget a chat, click the book icon beneath the message referencing the chat and select the chat to remove. Alternatively, disable memory in the "Data Controls" section of settings.', 'info', 10000);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showNotification,
        hideNotification,
        showModal,
        closeModal,
        apiRequest,
        saveToStorage,
        getFromStorage,
        removeFromStorage,
        formatDate,
        formatNumber,
        debounce,
        throttle,
        handleMemoryForgetRequest
    };
}