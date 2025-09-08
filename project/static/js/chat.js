// Chat JavaScript functionality

let chatMessages = [];
let isVoiceActive = false;
let recognition = null;
let synthesis = null;

// Sanitize HTML to prevent XSS
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Initialize Chat
document.addEventListener('DOMContentLoaded', function() {
    initializeChat();
});

function initializeChat() {
    setupChatEventListeners();
    setupVoiceRecognition();
    setupSpeechSynthesis();
    setupAutoResize();
    lazyLoadChatHistory();
}

function setupChatEventListeners() {
    const chatForm = document.getElementById('chatForm');
    if (chatForm) {
        chatForm.setAttribute('role', 'form');
        chatForm.addEventListener('submit', handleChatSubmit);
    }
    
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.setAttribute('aria-label', 'Chat message input');
        messageInput.addEventListener('input', handleInputChange);
        messageInput.addEventListener('keydown', handleKeyDown);
    }
    
    document.addEventListener('click', function(e) {
        if (e.target.closest('[onclick*="toggleVoice"]')) {
            e.preventDefault();
            toggleVoice();
        }
        if (e.target.closest('[onclick*="clearChat"]')) {
            e.preventDefault();
            clearChat();
        }
        if (e.target.closest('[onclick*="stopVoiceInput"]')) {
            e.preventDefault();
            stopVoiceInput();
        }
    });
}

function setupAutoResize() {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    }
}

async function handleChatSubmit(e) {
    e.preventDefault();
    
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) {
        showNotification('Please enter a message', 'warning');
        return;
    }
    
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    addMessageToChat(sanitizeHTML(message), 'user');
    showTypingIndicator();
    
    try {
        const response = await apiRequest('/api/chat', {
            method: 'POST',
            body: JSON.stringify({ message })
        });
        
        if (response.success) {
            removeTypingIndicator();
            addMessageToChat(sanitizeHTML(response.response), 'assistant');
            saveChatToStorage();
            if (isVoiceActive && synthesis && 'speechSynthesis' in window) {
                speakText(response.response);
            }
        } else {
            removeTypingIndicator();
            showNotification('Failed to get response from AI assistant', 'error');
        }
    } catch (error) {
        console.error('Chat error:', error);
        removeTypingIndicator();
        showNotification('Network error. Please try again.', 'error');
    }
}

function handleInputChange(e) {
    const input = e.target;
    const charCount = input.value.length;
    const charCountElement = document.querySelector('.char-count');
    
    if (charCountElement) {
        charCountElement.textContent = `${charCount}/1000`;
        charCountElement.setAttribute('aria-live', 'polite');
        
        if (charCount > 900) {
            charCountElement.style.color = 'var(--error-color)';
        } else if (charCount > 800) {
            charCountElement.style.color = 'var(--warning-color)';
        } else {
            charCountElement.style.color = 'var(--gray-500)';
        }
    }
    
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.disabled = !input.value.trim();
    }
}

function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('chatForm').dispatchEvent(new Event('submit'));
    }
    
    if (e.shiftKey && e.key === 'Enter') {
        return;
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('chatForm').dispatchEvent(new Event('submit'));
    }
}

function addMessageToChat(message, sender) {
    const chatMessagesContainer = document.getElementById('chatMessages');
    if (!chatMessagesContainer) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}-message`;
    messageElement.setAttribute('role', 'log');
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
        <div class="message-avatar">
            <i class="fas ${sender === 'user' ? 'fa-user' : 'fa-robot'}" aria-hidden="true"></i>
        </div>
        <div class="message-content">
            <div class="message-bubble">${formatMessage(message)}</div>
            <div class="message-time">${timestamp}</div>
            ${sender === 'assistant' ? `
                <div class="message-actions">
                    <button class="message-action" onclick="copyMessage(this)" aria-label="Copy message">
                        <i class="fas fa-copy" aria-hidden="true"></i>
                    </button>
                    <button class="message-action" onclick="speakMessage(this)" aria-label="Read message aloud">
                        <i class="fas fa-volume-up" aria-hidden="true"></i>
                    </button>
                </div>
            ` : ''}
        </div>
    `;
    
    chatMessagesContainer.appendChild(messageElement);
    scrollToBottom();
    
    chatMessages.push({
        message,
        sender,
        timestamp: new Date().toISOString()
    });
}

function formatMessage(message) {
    let formatted = message
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
    return formatted;
}

function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'message assistant-message typing-indicator';
    typingIndicator.id = 'typingIndicator';
    typingIndicator.setAttribute('aria-live', 'polite');
    
    typingIndicator.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot" aria-hidden="true"></i>
        </div>
        <div class="message-content">
            <div class="message-bubble">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(typingIndicator);
    scrollToBottom();
}

function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);
    }
}

function setupVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.value = sanitizeHTML(transcript);
                handleInputChange({ target: messageInput });
            }
            stopVoiceInput();
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            stopVoiceInput();
            if (event.error === 'no-speech') {
                showNotification('No speech detected. Please try again.', 'warning');
            } else if (event.error === 'not-allowed') {
                showNotification('Microphone permission denied. Please enable it in your browser settings.', 'error');
            } else {
                showNotification('Voice recognition error. Please try again.', 'error');
            }
        };
        
        recognition.onend = function() {
            stopVoiceInput();
        };
    }
}

function setupSpeechSynthesis() {
    if ('speechSynthesis' in window) {
        synthesis = window.speechSynthesis;
    }
}

function toggleVoice() {
    if (isVoiceActive) {
        stopVoiceInput();
    } else {
        startVoiceInput();
    }
}

function startVoiceInput() {
    if (!recognition) {
        showNotification('Voice recognition is not supported in your browser', 'error');
        return;
    }
    
    isVoiceActive = true;
    
    const voiceBtn = document.getElementById('voiceBtn');
    const micIcon = document.getElementById('micIcon');
    
    if (voiceBtn) {
        voiceBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
        voiceBtn.classList.add('recording');
        voiceBtn.setAttribute('aria-label', 'Stop voice input');
    }
    
    if (micIcon) {
        micIcon.className = 'fas fa-microphone-slash';
    }
    
    showModal('voiceModal');
    
    try {
        recognition.start();
    } catch (error) {
        console.error('Error starting voice recognition:', error);
        stopVoiceInput();
        showNotification('Failed to start voice recognition', 'error');
    }
}

function stopVoiceInput() {
    isVoiceActive = false;
    
    if (recognition) {
        recognition.stop();
    }
    
    const voiceBtn = document.getElementById('voiceBtn');
    const micIcon = document.getElementById('micIcon');
    
    if (voiceBtn) {
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i> Voice';
        voiceBtn.classList.remove('recording');
        voiceBtn.setAttribute('aria-label', 'Start voice input');
    }
    
    if (micIcon) {
        micIcon.className = 'fas fa-microphone';
    }
    
    closeModal('voiceModal');
}

function speakText(text) {
    if (!synthesis || !text) return;
    
    synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    const voices = synthesis.getVoices();
    const preferredVoice = voices.find(voice => 
        voice.lang.includes('en') && 
        (voice.name.includes('Female') || voice.name.includes('Samantha'))
    );
    
    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }
    
    synthesis.speak(utterance);
}

function copyMessage(button) {
    const messageText = button.closest('.message-content').querySelector('.message-bubble').textContent;
    
    navigator.clipboard.writeText(messageText).then(() => {
        showNotification('Message copied to clipboard', 'success');
    }).catch(() => {
        showNotification('Failed to copy message', 'error');
    });
}

function speakMessage(button) {
    const messageText = button.closest('.message-content').querySelector('.message-bubble').textContent;
    speakText(messageText);
}

function lazyLoadChatHistory() {
    const chatContainer = document.getElementById('chatMessages');
    if (!chatContainer) return;
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadChatHistory();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    observer.observe(chatContainer);
}

async function loadChatHistory() {
    const cacheKey = 'chat_history';
    const cacheExpiration = 15 * 60 * 1000; // 15 minutes
    const cachedHistory = getFromStorage(cacheKey);
    
    if (cachedHistory && cachedHistory.timestamp && Date.now() - cachedHistory.timestamp < cacheExpiration) {
        displayChatHistory(cachedHistory.data.slice(-20));
        return;
    }
    
    try {
        const response = await apiRequest('/api/chat/history');
        if (response && response.length > 0) {
            chatMessages = response;
            saveChatToStorage();
            displayChatHistory(response.slice(-20));
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        const localHistory = getFromStorage('chat_history', []);
        if (localHistory.length > 0) {
            displayChatHistory(localHistory.slice(-20));
        }
    }
}

function displayChatHistory(history) {
    const chatMessagesContainer = document.getElementById('chatMessages');
    if (!chatMessagesContainer) return;
    
    const welcomeMessage = chatMessagesContainer.querySelector('.message.assistant-message');
    chatMessagesContainer.innerHTML = '';
    if (welcomeMessage) {
        chatMessagesContainer.appendChild(welcomeMessage);
    }
    
    history.forEach(entry => {
        addMessageToChat(sanitizeHTML(entry.user_message), 'user');
        addMessageToChat(sanitizeHTML(entry.ai_response), 'assistant');
    });
}

function clearChat() {
    if (confirm('Are you sure you want to clear the chat history?')) {
        const chatMessagesContainer = document.getElementById('chatMessages');
        if (chatMessagesContainer) {
            const welcomeMessage = chatMessagesContainer.querySelector('.message.assistant-message');
            chatMessagesContainer.innerHTML = '';
            if (welcomeMessage) {
                chatMessagesContainer.appendChild(welcomeMessage);
            }
        }
        
        chatMessages = [];
        removeFromStorage('chat_history');
        showNotification('Chat history cleared. To manage saved chats, click the book icon beneath the message or disable memory in settings.', 'success', 10000);
    }
}

function saveChatToStorage() {
    saveToStorage('chat_history', { data: chatMessages.slice(-50), timestamp: Date.now() });
}

// Add CSS for chat styling
const style = document.createElement('style');
style.textContent = `
.chat-page {
    height: calc(100vh - 80px);
    display: flex;
    flex-direction: column;
}

.chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-width: 1000px;
    margin: 0 auto;
    background: var(--white);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    overflow: hidden;
}

.chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 2rem;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    color: var(--white);
}

.chat-title {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.chat-icon {
    width: 3rem;
    height: 3rem;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
}

.chat-info h2 {
    color: var(--white);
    margin: 0;
    font-size: 1.5rem;
}

.chat-info p {
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
    font-size: 0.875rem;
}

.chat-actions {
    display: flex;
    gap: 0.5rem;
}

.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: var(--gray-50);
}

.message {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
}

.user-message {
    flex-direction: row-reverse;
}

.message-avatar {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    flex-shrink: 0;
}

.user-message .message-avatar {
    background: var(--primary-color);
    color: var(--white);
}

.assistant-message .message-avatar {
    background: var(--secondary-color);
    color: var(--white);
}

.message-content {
    max-width: 70%;
    position: relative;
}

.user-message .message-content {
    text-align: right;
}

.message-bubble {
    background: var(--white);
    padding: 1rem 1.5rem;
    border-radius: 1.5rem;
    box-shadow: var(--shadow-sm);
    position: relative;
    word-wrap: break-word;
}

.user-message .message-bubble {
    background: var(--primary-color);
    color: var(--white);
    border-bottom-right-radius: 0.5rem;
}

.assistant-message .message-bubble {
    border-bottom-left-radius: 0.5rem;
}

.message-time {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: 0.25rem;
    padding: 0 1rem;
}

.message-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
    padding: 0 1rem;
    opacity: 0;
    transition: var(--transition);
}

.message:hover .message-actions {
    opacity: 1;
}

.message-action {
    background: none;
    border: none;
    color: var(--gray-400);
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    transition: var(--transition);
}

.message-action:hover {
    background: var(--gray-100);
    color: var(--gray-600);
}

.typing-indicator .message-bubble {
    background: var(--gray-200);
}

.typing-dots {
    display: flex;
    gap: 0.25rem;
    align-items: center;
    justify-content: center;
}

.typing-dots span {
    width: 0.5rem;
    height: 0.5rem;
    background: var(--gray-500);
    border-radius: 50%;
    animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) {
    animation-delay: -0.32s;
}

.typing-dots span:nth-child(2) {
    animation-delay: -0.16s;
}

@keyframes typing {
    0%, 80%, 100% {
        transform: scale(0);
        opacity: 0.5;
    }
    40% {
        transform: scale(1);
        opacity: 1;
    }
}

.chat-input-container {
    background: var(--white);
    border-top: 1px solid var(--gray-200);
    padding: 1rem 1.5rem;
}

.input-wrapper {
    position: relative;
    background: var(--gray-50);
    border-radius: var(--border-radius);
    border: 2px solid var(--gray-200);
    transition: var(--transition);
}

.input-wrapper:focus-within {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--primary-light);
}

.input-wrapper textarea {
    width: 100%;
    border: none;
    background: transparent;
    padding: 1rem 5rem 1rem 1rem;
    resize: none;
    font-family: inherit;
    font-size: 1rem;
    line-height: 1.5;
    max-height: 120px;
}

.input-wrapper textarea:focus {
    outline: none;
}

.input-actions {
    position: absolute;
    right: 0.5rem;
    bottom: 0.5rem;
    display: flex;
    gap: 0.25rem;
    align-items: center;
}

.input-action {
    background: none;
    border: none;
    color: var(--gray-400);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.5rem;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
}

.input-action:hover {
    background: var(--gray-200);
    color: var(--gray-600);
}

.input-action:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.send-btn {
    background: var(--primary-color);
    color: var(--white);
}

.send-btn:hover:not(:disabled) {
    background: var(--primary-dark);
}

.input-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: var(--gray-500);
}

.char-count {
    font-family: monospace;
}

.disclaimer {
    font-style: italic;
}

.voice-modal .modal-content {
    max-width: 400px;
    text-align: center;
}

.voice-recording {
    padding: 2rem;
}

.voice-animation {
    position: relative;
    width: 100px;
    height: 100px;
    margin: 0 auto 2rem;
}

.voice-circle {
    width: 100px;
    height: 100px;
    background: var(--primary-color);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--white);
    font-size: 2rem;
}

.voice-circle::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    border: 2px solid var(--primary-color);
    border-radius: 50%;
    animation: voice-pulse 2s infinite;
}

.voice-pulse {
    position: absolute;
    width: 100%;
    height: 100%;
    border: 2px solid var(--primary-color);
    border-radius: 50%;
    opacity: 0.4;
    animation: voice-pulse 2s infinite 0.5s;
}

@keyframes voice-pulse {
    0% {
        transform: scale(1);
        opacity: 0.4;
    }
    50% {
        transform: scale(1.2);
        opacity: 0.1;
    }
    100% {
        transform: scale(1);
        opacity: 0.4;
    }
}

.voice-actions {
    margin-top: 1.5rem;
}

.recording .btn-text {
    color: var(--error-color);
}

@media (max-width: 768px) {
    .chat-container {
        height: 100vh;
        border-radius: 0;
        margin: 0;
    }
    
    .chat-header {
        padding: 1rem;
    }
    
    .chat-actions {
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .btn-small {
        font-size: 0.75rem;
        padding: 0.375rem 0.75rem;
    }
    
    .message-content {
        max-width: 85%;
    }
    
    .chat-messages {
        padding: 1rem;
    }
    
    .chat-input-container {
        padding: 0.75rem 1rem;
    }
    
    .input-footer {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
    }
}

@media (max-width: 480px) {
    .message-content {
        max-width: 90%;
    }
    
    .chat-info h2 {
        font-size: 1.25rem;
    }
    
    .message-bubble {
        padding: 0.75rem 1rem;
    }
}
`;
document.head.appendChild(style);