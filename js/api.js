/**
 * Hugging Face API Manager
 * مدیریت ارتباط با API های Hugging Face
 */
class HuggingFaceAPI {
    constructor() {
        this.baseURL = 'https://api-inference.huggingface.co/models/';
        this.apiKey = this.getStoredApiKey();
        this.currentModel = this.getStoredModel() || 'microsoft/DialoGPT-medium';
        this.requestCount = parseInt(localStorage.getItem('ai-request-count') || '0');
        this.rateLimitReset = null;
        this.isConnected = false;
        
        this.init();
    }

    /**
     * مقداردهی اولیه
     */
    init() {
        this.updateModelDisplay();
        this.updateStats();
        this.checkConnection();
    }

    /**
     * دریافت کلید API ذخیره شده
     */
    getStoredApiKey() {
        return localStorage.getItem('hf_api_key') || '';
    }

    /**
     * دریافت مدل ذخیره شده
     */
    getStoredModel() {
        return localStorage.getItem('selected_model');
    }

    /**
     * تنظیم کلید API
     */
    setApiKey(key) {
        this.apiKey = key.trim();
        localStorage.setItem('hf_api_key', this.apiKey);
        this.checkConnection();
    }

    /**
     * تنظیم مدل
     */
    setModel(model) {
        this.currentModel = model;
        localStorage.setItem('selected_model', model);
        this.updateModelDisplay();
        this.checkConnection();
    }

    /**
     * به‌روزرسانی نمایش مدل
     */
    updateModelDisplay() {
        const modelName = this.currentModel.split('/')[1] || this.currentModel;
        const currentModelElement = document.getElementById('currentModel');
        if (currentModelElement) {
            currentModelElement.textContent = modelName;
        }
    }

    /**
     * تولید پاسخ
     */
    async generateResponse(message, options = {}) {
        if (!this.apiKey) {
            throw new Error('کلید API تنظیم نشده است. لطفاً در تنظیمات کلید API خود را وارد کنید.');
        }

        if (!message.trim()) {
            throw new Error('پیام نمی‌تواند خالی باشد.');
        }

        const startTime = Date.now();
        
        try {
            // بررسی محدودیت نرخ
            await this.checkRateLimit();

            const response = await fetch(`${this.baseURL}${this.currentModel}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'AI-Dashboard/1.0'
                },
                body: JSON.stringify({
                    inputs: message,
                    parameters: {
                        max_length: options.maxTokens || 200,
                        temperature: options.temperature || 0.7,
                        do_sample: true,
                        top_p: 0.9,
                        top_k: 50,
                        repetition_penalty: 1.1,
                        return_full_text: false,
                        pad_token_id: 50256
                    },
                    options: {
                        wait_for_model: true,
                        use_cache: false
                    }
                })
            });

            // بررسی وضعیت پاسخ
            if (!response.ok) {
                await this.handleApiError(response);
            }

            const data = await response.json();
            const responseTime = Date.now() - startTime;
            
            // به‌روزرسانی آمار
            this.requestCount++;
            this.updateStats(responseTime);
            this.updateConnectionStatus(true);
            
            // پردازش پاسخ
            return this.processResponse(data, message);
            
        } catch (error) {
            this.updateConnectionStatus(false);
            console.error('API Error:', error);
            throw error;
        }
    }

    /**
     * بررسی محدودیت نرخ
     */
    async checkRateLimit() {
        if (this.rateLimitReset && Date.now() < this.rateLimitReset) {
            const waitTime = Math.ceil((this.rateLimitReset - Date.now()) / 1000);
            throw new Error(`محدودیت نرخ درخواست. لطفاً ${waitTime} ثانیه صبر کنید.`);
        }
    }

    /**
     * مدیریت خطاهای API
     */
    async handleApiError(response) {
        const errorData = await response.json().catch(() => ({}));
        
        switch (response.status) {
            case 401:
                throw new Error('کلید API نامعتبر است. لطفاً کلید صحیح را وارد کنید.');
            case 403:
                throw new Error('دسترسی به این مدل محدود است.');
            case 429:
                // محدودیت نرخ
                const resetTime = response.headers.get('x-ratelimit-reset');
                if (resetTime) {
                    this.rateLimitReset = parseInt(resetTime) * 1000;
                }
                throw new Error('تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید.');
            case 503:
                throw new Error('مدل در حال بارگذاری است. لطفاً چند دقیقه صبر کنید.');
            default:
                throw new Error(errorData.error || `خطای HTTP ${response.status}`);
        }
    }

    /**
     * پردازش پاسخ API
     */
    processResponse(data, originalMessage) {
        let response = '';

        if (Array.isArray(data) && data.length > 0) {
            response = data[0].generated_text || data[0].text || '';
        } else if (data.generated_text) {
            response = data.generated_text;
        } else if (data[0] && data[0].summary_text) {
            response = data[0].summary_text;
        } else if (data[0] && data[0].translation_text) {
            response = data[0].translation_text;
        } else {
            response = 'متأسفانه نتوانستم پاسخ مناسبی تولید کنم.';
        }

        // تمیز کردن پاسخ
        return this.cleanResponse(response, originalMessage);
    }

    /**
     * تمیز کردن پاسخ
     */
    cleanResponse(response, originalMessage) {
        if (!response || typeof response !== 'string') {
            return 'متأسفانه نتوانستم پاسخ مناسبی تولید کنم. لطفاً دوباره تلاش کنید.';
        }

        // حذف پیام اصلی از پاسخ
        let cleaned = response.replace(originalMessage, '').trim();
        
        // حذف پیشوندهای رایج
        cleaned = cleaned.replace(/^(AI:|Bot:|Assistant:|Human:|User:)/gi, '').trim();
        
        // حذف کاراکترهای اضافی
        cleaned = cleaned.replace(/^\W+/, '').trim();
        
        // بررسی طول پاسخ
        if (cleaned.length < 3) {
            return 'متأسفانه نتوانستم پاسخ مناسبی تولید کنم. لطفاً سوال خود را واضح‌تر مطرح کنید.';
        }

        // محدود کردن طول پاسخ
        if (cleaned.length > 1000) {
            cleaned = cleaned.substring(0, 1000) + '...';
        }

        return cleaned;
    }

    /**
     * به‌روزرسانی آمار
     */
    updateStats(responseTime = null) {
        // تعداد چت‌ها
        const totalChatsElement = document.getElementById('totalChats');
        if (totalChatsElement) {
            totalChatsElement.textContent = this.requestCount.toLocaleString('fa-IR');
        }

        // زمان پاسخ
        if (responseTime !== null) {
            const responseTimeElement = document.getElementById('responseTime');
            if (responseTimeElement) {
                responseTimeElement.textContent = `${responseTime.toLocaleString('fa-IR')}ms`;
            }
        }

        // ذخیره تعداد درخواست‌ها
        localStorage.setItem('ai-request-count', this.requestCount.toString());
    }

    /**
     * به‌روزرسانی وضعیت اتصال
     */
    updateConnectionStatus(isConnected) {
        this.isConnected = isConnected;
        const statusElement = document.getElementById('connectionStatus');
        const apiStatusElement = document.getElementById('apiStatus');
        
        if (statusElement) {
            const icon = statusElement.querySelector('i');
            const text = statusElement.querySelector('span');
            
            if (isConnected) {
                statusElement.className = 'connection-status online';
                if (text) text.textContent = 'آنلاین';
                if (apiStatusElement) apiStatusElement.textContent = 'متصل';
            } else {
                statusElement.className = 'connection-status offline';
                if (text) text.textContent = 'آفلاین';
                if (apiStatusElement) apiStatusElement.textContent = 'قطع';
            }
        }
    }

    /**
     * تست اتصال
     */
    async testConnection() {
        if (!this.apiKey) {
            throw new Error('کلید API تنظیم نشده است.');
        }

        try {
            const response = await fetch(`${this.baseURL}${this.currentModel}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: "Hello",
                    parameters: { max_length: 10 }
                })
            });
            
            const isConnected = response.ok || response.status === 503; // 503 = model loading
            this.updateConnectionStatus(isConnected);
            
            if (response.ok) {
                return { success: true, message: 'اتصال با موفقیت برقرار شد!' };
            } else if (response.status === 503) {
                return { success: true, message: 'مدل در حال بارگذاری است اما اتصال برقرار است.' };
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'خطا در برقراری اتصال');
            }
            
        } catch (error) {
            this.updateConnectionStatus(false);
            throw error;
        }
    }

    /**
     * بررسی اتصال خودکار
     */
    async checkConnection() {
        if (!this.apiKey) {
            this.updateConnectionStatus(false);
            return;
        }

        try {
            await this.testConnection();
        } catch (error) {
            console.warn('Connection check failed:', error.message);
        }
    }

    /**
     * دریافت مدل‌های موجود
     */
    getAvailableModels() {
        return {
            // مدل‌های مکالمه
            'microsoft/DialoGPT-medium': 'مکالمه عمومی - متوسط',
            'microsoft/DialoGPT-large': 'مکالمه عمومی - بزرگ',
            'facebook/blenderbot-400M-distill': 'چت دوستانه',
            'microsoft/DialoGPT-small': 'مکالمه سریع',
            
            // مدل‌های پرسش و پاسخ
            'google/flan-t5-large': 'پرسش و پاسخ پیشرفته',
            'google/flan-t5-base': 'پرسش و پاسخ پایه',
            'deepset/roberta-base-squad2': 'پاسخ به سوالات',
            
            // مدل‌های ترجمه
            'Helsinki-NLP/opus-mt-en-fa': 'ترجمه انگلیسی به فارسی',
            'Helsinki-NLP/opus-mt-fa-en': 'ترجمه فارسی به انگلیسی',
            'persiannlp/mt5-small-parsinlu-opus-translation_en_fa': 'ترجمه پیشرفته',
            
            // مدل‌های خلاصه‌سازی
            'facebook/bart-large-cnn': 'خلاصه‌سازی متن',
            'sshleifer/distilbart-cnn-12-6': 'خلاصه‌سازی سریع',
            
            // مدل‌های تحلیل احساسات
            'cardiffnlp/twitter-roberta-base-sentiment-latest': 'تحلیل احساسات',
            'nlptown/bert-base-multilingual-uncased-sentiment': 'تحلیل احساسات چندزبانه'
        };
    }

    /**
     * دریافت دسته‌بندی مدل‌ها
     */
    getModelCategories() {
        return {
            'conversation': {
                name: 'مکالمه',
                models: [
                    'microsoft/DialoGPT-medium',
                    'microsoft/DialoGPT-large',
                    'facebook/blenderbot-400M-distill',
                    'microsoft/DialoGPT-small'
                ]
            },
            'qa': {
                name: 'پرسش و پاسخ',
                models: [
                    'google/flan-t5-large',
                    'google/flan-t5-base',
                    'deepset/roberta-base-squad2'
                ]
            },
            'translation': {
                name: 'ترجمه',
                models: [
                    'Helsinki-NLP/opus-mt-en-fa',
                    'Helsinki-NLP/opus-mt-fa-en',
                    'persiannlp/mt5-small-parsinlu-opus-translation_en_fa'
                ]
            },
            'summarization': {
                name: 'خلاصه‌سازی',
                models: [
                    'facebook/bart-large-cnn',
                    'sshleifer/distilbart-cnn-12-6'
                ]
            },
            'sentiment': {
                name: 'تحلیل احساسات',
                models: [
                    'cardiffnlp/twitter-roberta-base-sentiment-latest',
                    'nlptown/bert-base-multilingual-uncased-sentiment'
                ]
            }
        };
    }

    /**
     * ریست آمار
     */
    resetStats() {
        this.requestCount = 0;
        localStorage.removeItem('ai-request-count');
        this.updateStats();
    }

    /**
     * دریافت اطلاعات مدل فعلی
     */
    getCurrentModelInfo() {
        const models = this.getAvailableModels();
        return {
            id: this.currentModel,
            name: models[this.currentModel] || 'نامشخص',
            category: this.getModelCategory(this.currentModel)
        };
    }

    /**
     * دریافت دسته‌بندی مدل
     */
    getModelCategory(modelId) {
        const categories = this.getModelCategories();
        for (const [categoryId, category] of Object.entries(categories)) {
            if (category.models.includes(modelId)) {
                return category.name;
            }
        }
        return 'عمومی';
    }
}

// صادر کردن کلاس برای استفاده در سایر فایل‌ها
window.HuggingFaceAPI = HuggingFaceAPI;
