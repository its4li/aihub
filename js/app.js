/**
 * AI Chat Application
 * اپلیکیشن اصلی چت با هوش مصنوعی
 */
class AIChat {
    constructor() {
        this.api = new HuggingFaceAPI();
        this.chatHistory = [];
        this.isProcessing = false;
        this.currentFeature = 'chat';
        this.settings = this.loadSettings();
        
        this.init();
    }

    /**
     * مقداردهی اولیه
     */
    init() {
        this.hideLoadingScreen();
        this.bindEvents();
        this.setupModelSelector();
        this.loadChatHistory();
        this.setupQuickActions();
        this.setupFeatureButtons();
        this.initializeSettings();
        this.startPeriodicConnectionCheck();
    }

    /**
     * مخفی کردن صفحه بارگذاری
     */
    hideLoadingScreen() {
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
                setTimeout(() => {
                    loadingScreen.remove();
                }, 500);
            }
        }, 1500);
    }

    /**
     * اتصال رویدادها
     */
    bindEvents() {
        // رویدادهای ارسال پیام
        const sendButton = document.getElementById('sendButton');
        const messageInput = document.getElementById('messageInput');
        
        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendMessage());
        }
        
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // شمارنده کاراکتر و کلمه
            messageInput.addEventListener('input', (e) => this.updateInputStats(e.target.value));
        }

        // رویدادهای تنظیمات
        this.bindSettingsEvents();
        
        // رویدادهای چت
        this.bindChatEvents();
        
        // رویدادهای کلیدهای میانبر
        this.bindKeyboardShortcuts();
    }

    /**
     * رویدادهای تنظیمات
     */
    bindSettingsEvents() {
        // تغییر کلید API
        const apiKeyInput = document.getElementById('apiKey');
        if (apiKeyInput) {
            apiKeyInput.addEventListener('change', (e) => {
                this.api.setApiKey(e.target.value);
                this.saveSettings();
            });
        }

        // تغییر مدل
        const modelSelect = document.getElementById('modelSelect');
        if (modelSelect) {
            modelSelect.addEventListener('change', (e) => {
                this.api.setModel(e.target.value);
                this.saveSettings();
            });
        }

        // تنظیمات محدوده
        const maxTokensInput = document.getElementById('maxTokens');
        const temperatureInput = document.getElementById('temperature');
        
        if (maxTokensInput) {
            maxTokensInput.addEventListener('input', (e) => {
                document.getElementById('tokenValue').textContent = e.target.value;
                this.saveSettings();
            });
        }
        
        if (temperatureInput) {
            temperatureInput.addEventListener('input', (e) => {
                document.getElementById('tempValue').textContent = e.target.value;
                this.saveSettings();
            });
        }

        // نمایش/مخفی کردن رمز عبور
        const togglePassword = document.getElementById('togglePassword');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
        }

        // تنظیمات زبان
        const languageSelect = document.getElementById('language');
        if (languageSelect) {
            languageSelect.addEventListener('change', () => this.saveSettings());
        }

        // دکمه‌های عملیات
        const toggleSettings = document.getElementById('toggleSettings');
        const testConnection = document.getElementById('testConnection');
        const resetSettings = document.getElementById('resetSettings');
        const saveSettings = document.getElementById('saveSettings');

        if (toggleSettings) {
            toggleSettings.addEventListener('click', () => this.toggleSettings());
        }
        
        if (testConnection) {
            testConnection.addEventListener('click', () => this.testApiConnection());
        }
        
        if (resetSettings) {
            resetSettings.addEventListener('click', () => this.resetSettings());
        }
        
        if (saveSettings) {
            saveSettings.addEventListener('click', () => this.saveSettings());
        }
    }

    /**
     * رویدادهای چت
     */
    bindChatEvents() {
        // پاک کردن چت
        const clearChat = document.getElementById('clearChat');
        if (clearChat) {
            clearChat.addEventListener('click', () => this.clearChat());
        }

        // خروجی گرفتن از چت
        const exportChat = document.getElementById('exportChat');
        if (exportChat) {
            exportChat.addEventListener('click', () => this.exportChat());
        }

        // دکمه ضمیمه
        const attachmentBtn = document.getElementById('attachmentBtn');
        if (attachmentBtn) {
            attachmentBtn.addEventListener('click', () => this.handleAttachment());
        }
    }

    /**
     * کلیدهای میانبر
     */
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter: ارسال پیام
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.sendMessage();
            }
            
            // Ctrl/Cmd + K: فوکوس روی ورودی
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('messageInput')?.focus();
            }
            
            // Ctrl/Cmd + Shift + C: پاک کردن چت
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                this.clearChat();
            }
            
            // Escape: لغو پردازش
            if (e.key === 'Escape' && this.isProcessing) {
                this.cancelProcessing();
            }
        });
    }

    /**
     * راه‌اندازی انتخابگر مدل
     */
    setupModelSelector() {
        const modelSelect = document.getElementById('modelSelect');
        if (!modelSelect) return;

        const categories = this.api.getModelCategories();
        const models = this.api.getAvailableModels();
        
        modelSelect.innerHTML = '';
        
        // اضافه کردن مدل‌ها بر اساس دسته‌بندی
        Object.entries(categories).forEach(([categoryId, category]) => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category.name;
            
            category.models.forEach(modelId => {
                const option = document.createElement('option');
                option.value = modelId;
                option.textContent = models[modelId] || modelId;
                optgroup.appendChild(option);
            });
            
            modelSelect.appendChild(optgroup);
        });

        // تنظیم مدل انتخاب شده
        modelSelect.value = this.api.currentModel;
    }

    /**
     * راه‌اندازی اقدامات سریع
     */
    setupQuickActions() {
        const quickButtons = document.querySelectorAll('.quick-btn');
        quickButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const message = btn.getAttribute('data-message');
                if (message) {
                    document.getElementById('messageInput').value = message;
                    this.sendMessage();
                }
            });
        });
    }

    /**
     * راه‌اندازی دکمه‌های ویژگی
     */
    setupFeatureButtons() {
        const featureButtons = document.querySelectorAll('.feature-btn');
        featureButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const feature = btn.getAttribute('data-feature');
                this.switchFeature(feature);
            });
        });
    }

    /**
     * تغییر ویژگی
     */
    switchFeature(feature) {
        this.currentFeature = feature;
        
        const featureMessages = {
            'translate': 'لطفاً متن مورد نظر برای ترجمه را وارد کنید:',
            'summarize': 'لطفاً متن مورد نظر برای خلاصه‌سازی را وارد کنید:',
            'sentiment': 'لطفاً متن مورد نظر برای تحلیل احساسات را وارد کنید:',
            'qa': 'لطفاً سوال خود را مطرح کنید:'
        };

        const message = featureMessages[feature];
        if (message) {
            this.addMessage('ai', message);
            document.getElementById('messageInput')?.focus();
        }

        // تغییر مدل بر اساس ویژگی
        this.switchModelForFeature(feature);
    }

    /**
     * تغییر مدل بر اساس ویژگی
     */
    switchModelForFeature(feature) {
        const featureModels = {
            'translate': 'Helsinki-NLP/opus-mt-en-fa',
            'summarize': 'facebook/bart-large-cnn',
            'sentiment': 'cardiffnlp/twitter-roberta-base-sentiment-latest',
            'qa': 'google/flan-t5-large'
        };

        const model = featureModels[feature];
        if (model) {
            this.api.setModel(model);
            document.getElementById('modelSelect').value = model;
        }
    }

    /**
     * ارسال پیام
     */
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input?.value?.trim();

        if (!message || this.isProcessing) return;

        if (!this.api.apiKey) {
            this.showToast('لطفاً ابتدا کلید API خود را در تنظیمات وارد کنید', 'error');
            this.toggleSettings();
            return;
        }

        this.isProcessing = true;
        this.updateUI(true);

        // اضافه کردن پیام کاربر
        this.addMessage('user', message);
        input.value = '';
        this.updateInputStats('');

        try {
            // دریافت تنظیمات
            const settings = this.getGenerationSettings();

            // تولید پاسخ
            const response = await this.api.generateResponse(message, settings);

            // اضافه کردن پاسخ هوش مصنوعی
            this.addMessage('ai', response);

        } catch (error) {
            console.error('Error:', error);
            this.addMessage('ai', `خطا: ${error.message}`);
            this.showToast(error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.updateUI(false);
        }
    }

    /**
     * دریافت تنظیمات تولید
     */
    getGenerationSettings() {
        return {
            maxTokens: parseInt(document.getElementById('maxTokens')?.value || '200'),
            temperature: parseFloat(document.getElementById('temperature')?.value || '0.7'),
            language: document.getElementById('language')?.value || 'fa'
        };
    }

    /**
     * اضافه کردن پیام
     */
    addMessage(type, content) {
        const message = { 
            type, 
            content, 
            timestamp: Date.now(),
            id: this.generateMessageId()
        };
        
        this.chatHistory.push(message);
        this.renderMessage(message);
        this.saveChatHistory();
        this.scrollToBottom();
    }

    /**
     * تولید شناسه پیام
     */
    generateMessageId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * رندر کردن پیام
     */
    renderMessage(message) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;
        
        // حذف پیام خوش‌آمدگویی
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.type}`;
        messageDiv.setAttribute('data-message-id', message.id);
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = message.type === 'user' 
            ? '<i class="fas fa-user"></i>' 
            : '<i class="fas fa-robot"></i>';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = message.content;
        
        // اضافه کردن زمان
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = this.formatTimestamp(message.timestamp);
        timestamp.style.cssText = `
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-top: 0.25rem;
            opacity: 0.7;
        `;
        content.appendChild(timestamp);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        messagesContainer.appendChild(messageDiv);
    }

    /**
     * فرمت کردن زمان
     */
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // کمتر از یک دقیقه
            return 'همین الان';
        } else if (diff < 3600000) { // کمتر از یک ساعت
            const minutes = Math.floor(diff / 60000);
            return `${minutes} دقیقه پیش`;
        } else if (date.toDateString() === now.toDateString()) { // همان روز
            return date.toLocaleTimeString('fa-IR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } else {
            return date.toLocaleDateString('fa-IR');
        }
    }

    /**
     * رندر کردن تاریخچه چت
     */
    renderChatHistory() {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;
        
        messagesContainer.innerHTML = '';
        
        if (this.chatHistory.length === 0) {
            this.showWelcomeMessage();
        } else {
            this.chatHistory.forEach(message => this.renderMessage(message));
        }
    }

    /**
     * نمایش پیام خوش‌آمدگویی
     */
    showWelcomeMessage() {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">
                    <i class="fas fa-robot"></i>
                </div>
                <h3>به داشبورد هوش مصنوعی خوش آمدید!</h3>
                <p>من آماده کمک به شما هستم. سوال خود را بپرسید یا از قابلیت‌های مختلف استفاده کنید.</p>
                <div class="quick-actions">
                    <button class="quick-btn" data-message="سلام! چطوری؟">
                        <i class="fas fa-hand-wave"></i>
                        سلام
                    </button>
                    <button class="quick-btn" data-message="می‌تونی درباره خودت بگی؟">
                        <i class="fas fa-question"></i>
                        درباره تو
                    </button>
                    <button class="quick-btn" data-message="چه کارهایی می‌تونی انجام بدی؟">
                        <i class="fas fa-list"></i>
                        قابلیت‌ها
                    </button>
                </div>
            </div>
        `;

        this.setupQuickActions();
    }

    /**
     * به‌روزرسانی آمار ورودی
     */
    updateInputStats(value) {
        const charCount = document.getElementById('charCount');
        const wordCount = document.getElementById('wordCount');
        
        if (charCount) {
            charCount.textContent = `${value.length}/1000`;
        }
        
        if (wordCount) {
            const words = value.trim() ? value.trim().split(/\s+/).length : 0;
            wordCount.textContent = `${words} کلمه`;
        }
    }

    /**
     * به‌روزرسانی رابط کاربری
     */
    updateUI(processing) {
        const sendButton = document.getElementById('sendButton');
        const messageInput = document.getElementById('messageInput');
        const loadingIndicator = document.getElementById('loadingIndicator');

        if (sendButton) sendButton.disabled = processing;
        if (messageInput) messageInput.disabled = processing;
        
        if (loadingIndicator) {
            loadingIndicator.style.display = processing ? 'flex' : 'none';
        }
    }

    /**
     * اسکرول به پایین
     */
    scrollToBottom() {
        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    /**
     * پاک کردن چت
     */
    clearChat() {
        if (this.chatHistory.length === 0) {
            this.showToast('چتی برای پاک کردن وجود ندارد', 'info');
            return;
        }

        if (confirm('آیا مطمئن هستید که می‌خواهید تمام مکالمات را پاک کنید؟')) {
            this.chatHistory = [];
            this.saveChatHistory();
            this.renderChatHistory();
            this.showToast('چت با موفقیت پاک شد', 'success');
        }
    }

    /**
     * خروجی گرفتن از چت
     */
    exportChat() {
        if (this.chatHistory.length === 0) {
            this.showToast('چتی برای خروجی گرفتن وجود ندارد', 'info');
            return;
        }

        const chatText = this.chatHistory.map(msg => {
            const time = new Date(msg.timestamp).toLocaleString('fa-IR');
            const sender = msg.type === 'user' ? 'کاربر' : 'هوش مصنوعی';
            return `[${time}] ${sender}: ${msg.content}`;
        }).join('\n\n');

        const blob = new Blob([chatText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('چت با موفقیت ذخیره شد', 'success');
    }

    /**
     * مدیریت ضمیمه
     */
    handleAttachment() {
        this.showToast('قابلیت ضمیمه فایل به زودی اضافه خواهد شد', 'info');
    }

    /**
     * تغییر نمایش رمز عبور
     */
    togglePasswordVisibility() {
        const apiKeyInput = document.getElementById('apiKey');
        const toggleBtn = document.getElementById('togglePassword');
        
        if (apiKeyInput && toggleBtn) {
            const isPassword = apiKeyInput.type === 'password';
            apiKeyInput.type = isPassword ? 'text' : 'password';
            toggleBtn.innerHTML = isPassword 
                ? '<i class="fas fa-eye-slash"></i>' 
                : '<i class="fas fa-eye"></i>';
        }
    }

    /**
     * تغییر نمایش تنظیمات
     */
    toggleSettings() {
        const content = document.getElementById('settingsContent');
        const toggle = document.getElementById('toggleSettings');
        
        if (content && toggle) {
            const isActive = content.classList.contains('active');
            
            if (isActive) {
                content.classList.remove('active');
                toggle.classList.remove('active');
            } else {
                content.classList.add('active');
                toggle.classList.add('active');
            }
        }
    }

    /**
     * تست اتصال API
     */
    async testApiConnection() {
        const testBtn = document.getElementById('testConnection');
        if (!testBtn) return;

        const originalText = testBtn.innerHTML;
        testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال تست...';
        testBtn.disabled = true;

        try {
            const result = await this.api.testConnection();
            this.showToast(result.message, 'success');
        } catch (error) {
            this.showToast(`خطا در تست اتصال: ${error.message}`, 'error');
        } finally {
            testBtn.innerHTML = originalText;
            testBtn.disabled = false;
        }
    }

    /**
     * بازنشانی تنظیمات
     */
    resetSettings() {
        if (confirm('آیا مطمئن هستید که می‌خواهید تمام تنظیمات را بازنشانی کنید؟')) {
            // پاک کردن تنظیمات ذخیره شده
            localStorage.removeItem('ai-dashboard-settings');
            localStorage.removeItem('hf_api_key');
            localStorage.removeItem('selected_model');
            
            // بازنشانی فرم
            document.getElementById('apiKey').value = '';
            document.getElementById('maxTokens').value = '200';
            document.getElementById('temperature').value = '0.7';
            document.getElementById('language').value = 'fa';
            document.getElementById('modelSelect').value = 'microsoft/DialoGPT-medium';
            
            // به‌روزرسانی نمایش
            document.getElementById('tokenValue').textContent = '200';
            document.getElementById('tempValue').textContent = '0.7';
            
            // بازنشانی API
            this.api.setApiKey('');
            this.api.setModel('microsoft/DialoGPT-medium');
            
            this.showToast('تنظیمات با موفقیت بازنشانی شد', 'success');
        }
    }

    /**
     * ذخیره تنظیمات
     */
    saveSettings() {
        const settings = {
            apiKey: document.getElementById('apiKey')?.value || '',
            model: document.getElementById('modelSelect')?.value || 'microsoft/DialoGPT-medium',
            maxTokens: document.getElementById('maxTokens')?.value || '200',
            temperature: document.getElementById('temperature')?.value || '0.7',
            language: document.getElementById('language')?.value || 'fa'
        };

        localStorage.setItem('ai-dashboard-settings', JSON.stringify(settings));
        this.settings = settings;
        
        this.showToast('تنظیمات ذخیره شد', 'success');
    }

    /**
     * بارگذاری تنظیمات
     */
    loadSettings() {
        const saved = localStorage.getItem('ai-dashboard-settings');
        return saved ? JSON.parse(saved) : {};
    }

    /**
     * مقداردهی اولیه تنظیمات
     */
    initializeSettings() {
        // بارگذاری کلید API
        const savedApiKey = localStorage.getItem('hf_api_key');
        if (savedApiKey) {
            document.getElementById('apiKey').value = savedApiKey;
        }

        // بارگذاری مدل
        const savedModel = localStorage.getItem('selected_model');
        if (savedModel) {
            document.getElementById('modelSelect').value = savedModel;
        }

        // بارگذاری سایر تنظیمات
        if (this.settings.maxTokens) {
            document.getElementById('maxTokens').value = this.settings.maxTokens;
            document.getElementById('tokenValue').textContent = this.settings.maxTokens;
        }

        if (this.settings.temperature) {
            document.getElementById('temperature').value = this.settings.temperature;
            document.getElementById('tempValue').textContent = this.settings.temperature;
        }

        if (this.settings.language) {
            document.getElementById('language').value = this.settings.language;
        }
    }

    /**
     * بارگذاری تاریخچه چت
     */
    loadChatHistory() {
        const saved = localStorage.getItem('ai-chat-history');
        if (saved) {
            try {
                this.chatHistory = JSON.parse(saved);
                this.renderChatHistory();
            } catch (error) {
                console.error('Error loading chat history:', error);
                this.chatHistory = [];
                this.renderChatHistory();
            }
        } else {
            this.renderChatHistory();
        }
    }

    /**
     * ذخیره تاریخچه چت
     */
    saveChatHistory() {
        try {
            localStorage.setItem('ai-chat-history', JSON.stringify(this.chatHistory));
        } catch (error) {
            console.error('Error saving chat history:', error);
            this.showToast('خطا در ذخیره تاریخچه چت', 'error');
        }
    }

    /**
     * لغو پردازش
     */
    cancelProcessing() {
        if (this.isProcessing) {
            this.isProcessing = false;
            this.updateUI(false);
            this.showToast('پردازش لغو شد', 'info');
        }
    }

    /**
     * بررسی دوره‌ای اتصال
     */
    startPeriodicConnectionCheck() {
        // بررسی اتصال هر 5 دقیقه
        setInterval(() => {
            if (this.api.apiKey) {
                this.api.checkConnection();
            }
        }, 5 * 60 * 1000);
    }

    /**
     * نمایش اعلان
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = this.getToastIcon(type);
        toast.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // حذف خودکار بعد از 5 ثانیه
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    /**
     * دریافت آیکون اعلان
     */
    getToastIcon(type) {
        const icons = {
            'success': 'fas fa-check-circle',
            'error': 'fas fa-exclamation-circle',
            'warning': 'fas fa-exclamation-triangle',
            'info': 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }
}

// تابع سراسری برای نمایش اعلان
window.showToast = function(message, type = 'info') {
    if (window.aiChat) {
        window.aiChat.showToast(message, type);
    }
};

// مقداردهی اولیه اپلیکیشن
document.addEventListener('DOMContentLoaded', () => {
    window.aiChat = new AIChat();
});
