/**
 * Theme Manager Class
 * مدیریت تم‌های روشن و تاریک
 */
class ThemeManager {
    constructor() {
        this.theme = this.getStoredTheme() || this.getSystemTheme();
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.init();
    }

    /**
     * مقداردهی اولیه
     */
    init() {
        this.applyTheme();
        this.bindEvents();
        this.watchSystemTheme();
    }

    /**
     * دریافت تم ذخیره شده
     */
    getStoredTheme() {
        return localStorage.getItem('ai-dashboard-theme');
    }

    /**
     * دریافت تم سیستم
     */
    getSystemTheme() {
        return this.mediaQuery.matches ? 'dark' : 'light';
    }

    /**
     * اعمال تم
     */
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        this.updateThemeIcon();
        this.updateMetaThemeColor();
        
        // ذخیره تم
        localStorage.setItem('ai-dashboard-theme', this.theme);
        
        // اعلان تغییر تم
        this.dispatchThemeChange();
    }

    /**
     * به‌روزرسانی آیکون تم
     */
    updateThemeIcon() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;
        
        const icon = themeToggle.querySelector('i');
        if (!icon) return;
        
        if (this.theme === 'dark') {
            icon.className = 'fas fa-sun';
            themeToggle.title = 'تغییر به تم روشن';
        } else {
            icon.className = 'fas fa-moon';
            themeToggle.title = 'تغییر به تم تاریک';
        }
    }

    /**
     * به‌روزرسانی رنگ متا برای موبایل
     */
    updateMetaThemeColor() {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        
        const color = this.theme === 'dark' ? '#1a202c' : '#ffffff';
        metaThemeColor.content = color;
    }

    /**
     * تغییر تم
     */
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        
        // افکت انیمیشن نرم
        this.addTransitionEffect();
        
        // نمایش اعلان
        this.showThemeChangeNotification();
    }

    /**
     * افکت انتقال نرم
     */
    addTransitionEffect() {
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
    }

    /**
     * نمایش اعلان تغییر تم
     */
    showThemeChangeNotification() {
        const themeName = this.theme === 'dark' ? 'تاریک' : 'روشن';
        
        if (window.showToast) {
            window.showToast(`تم ${themeName} فعال شد`, 'success');
        }
    }

        /**
     * نظارت بر تغییرات تم سیستم
     */
    watchSystemTheme() {
        this.mediaQuery.addEventListener('change', (e) => {
            // فقط در صورتی که کاربر تم خاصی انتخاب نکرده باشد
            if (!this.getStoredTheme()) {
                this.theme = e.matches ? 'dark' : 'light';
                this.applyTheme();
            }
        });
    }

    /**
     * اعلان تغییر تم
     */
    dispatchThemeChange() {
        const event = new CustomEvent('themeChanged', {
            detail: { theme: this.theme }
        });
        document.dispatchEvent(event);
    }

    /**
     * اتصال رویدادها
     */
    bindEvents() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // کلید میانبر برای تغییر تم (Ctrl/Cmd + Shift + T)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    /**
     * دریافت تم فعلی
     */
    getCurrentTheme() {
        return this.theme;
    }

    /**
     * تنظیم تم خاص
     */
    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            this.theme = theme;
            this.applyTheme();
        }
    }
}

// مقداردهی اولیه مدیر تم
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});

