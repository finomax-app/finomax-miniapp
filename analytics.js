// سیستم آنالیتیکس و مانیتورینگ FinoMax
(function() {
    'use strict';
    
    // تنظیمات آنالیتیکس
    const ANALYTICS_CONFIG = {
        enabled: true,
        debug: false,
        sessionTimeout: 30 * 60 * 1000, // 30 دقیقه
        batchSize: 10,
        flushInterval: 5000 // 5 ثانیه
    };
    
    // ذخیره‌سازی رویدادها
    let eventQueue = [];
    let sessionId = generateSessionId();
    let userId = null;
    let startTime = Date.now();
    
    // تولید شناسه جلسه
    function generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // تولید شناسه کاربر
    function generateUserId() {
        let stored = localStorage.getItem('finomax_user_id');
        if (!stored) {
            stored = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('finomax_user_id', stored);
        }
        return stored;
    }
    
    // دریافت اطلاعات دستگاه
    function getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenWidth: screen.width,
            screenHeight: screen.height,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine
        };
    }
    
    // دریافت اطلاعات صفحه
    function getPageInfo() {
        return {
            url: window.location.href,
            title: document.title,
            referrer: document.referrer,
            pathname: window.location.pathname,
            search: window.location.search,
            hash: window.location.hash
        };
    }
    
    // ثبت رویداد
    function trackEvent(eventName, properties = {}) {
        if (!ANALYTICS_CONFIG.enabled) return;
        
        const event = {
            eventName: eventName,
            properties: {
                ...properties,
                sessionId: sessionId,
                userId: userId,
                timestamp: Date.now(),
                page: getPageInfo(),
                device: getDeviceInfo()
            }
        };
        
        // اضافه کردن اطلاعات تلگرام
        if (window.telegramApp && window.telegramApp.user) {
            event.properties.telegram = {
                userId: window.telegramApp.user.id,
                firstName: window.telegramApp.user.first_name,
                username: window.telegramApp.user.username,
                languageCode: window.telegramApp.user.language_code
            };
        }
        
        eventQueue.push(event);
        
        if (ANALYTICS_CONFIG.debug) {
            console.log('📊 Event tracked:', event);
        }
        
        // ارسال فوری برای رویدادهای مهم
        const criticalEvents = ['app_crash', 'payment_completed', 'user_registered'];
        if (criticalEvents.includes(eventName)) {
            flushEvents();
        }
    }
    
    // ارسال رویدادها
    function flushEvents() {
        if (eventQueue.length === 0) return;
        
        const events = [...eventQueue];
        eventQueue = [];
        
        // ارسال به سرور آنالیتیکس (شبیه‌سازی)
        sendToAnalytics(events);
        
        // ذخیره محلی برای backup
        saveToLocalStorage(events);
    }
    
    // ارسال به سرور آنالیتیکس
    function sendToAnalytics(events) {
        // در حالت واقعی، به API سرور ارسال می‌شود
        if (ANALYTICS_CONFIG.debug) {
            console.log('📤 Sending events to analytics:', events);
        }
        
        // شبیه‌سازی ارسال
        fetch('/api/analytics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                events: events,
                metadata: {
                    version: '1.0.0',
                    platform: 'telegram_miniapp'
                }
            })
        }).catch(error => {
            console.error('❌ Analytics error:', error);
            // بازگرداندن به صف در صورت خطا
            eventQueue.unshift(...events);
        });
    }
    
    // ذخیره محلی
    function saveToLocalStorage(events) {
        try {
            const stored = JSON.parse(localStorage.getItem('finomax_analytics') || '[]');
            stored.push(...events);
            
            // نگه‌داشتن فقط ۱۰۰ رویداد آخر
            if (stored.length > 100) {
                stored.splice(0, stored.length - 100);
            }
            
            localStorage.setItem('finomax_analytics', JSON.stringify(stored));
        } catch (error) {
            console.error('❌ LocalStorage error:', error);
        }
    }
    
    // رویدادهای خودکار
    function setupAutoTracking() {
        // ردیابی بارگذاری صفحه
        trackEvent('page_view', {
            loadTime: Date.now() - startTime
        });
        
        // ردیابی کلیک‌ها
        document.addEventListener('click', (e) => {
            const element = e.target;
            const tagName = element.tagName.toLowerCase();
            const className = element.className;
            const id = element.id;
            const text = element.textContent?.substring(0, 50);
            
            trackEvent('click', {
                tagName,
                className,
                id,
                text,
                x: e.clientX,
                y: e.clientY
            });
        });
        
        // ردیابی تغییر صفحه
        let currentPage = window.location.pathname;
        setInterval(() => {
            if (window.location.pathname !== currentPage) {
                trackEvent('page_change', {
                    from: currentPage,
                    to: window.location.pathname
                });
                currentPage = window.location.pathname;
            }
        }, 1000);
        
        // ردیابی خروج از صفحه
        window.addEventListener('beforeunload', () => {
            trackEvent('page_unload', {
                timeOnPage: Date.now() - startTime
            });
            flushEvents();
        });
        
        // ردیابی خطاهای JavaScript
        window.addEventListener('error', (e) => {
            trackEvent('javascript_error', {
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno,
                stack: e.error?.stack
            });
        });
        
        // ردیابی تغییر اتصال اینترنت
        window.addEventListener('online', () => {
            trackEvent('connection_restored');
        });
        
        window.addEventListener('offline', () => {
            trackEvent('connection_lost');
        });
    }
    
    // رویدادهای مخصوص بازی
    function setupGameTracking() {
        // ردیابی شروع استخراج
        document.addEventListener('click', (e) => {
            if (e.target.id === 'miningCircle') {
                trackEvent('mining_started', {
                    balance: window.appState?.balance || 0
                });
            }
        });
        
        // ردیابی بازی‌ها
        const gameButtons = ['wheelGameBtn', 'slotsGameBtn', 'diceGameBtn', 'coinFlipGameBtn', 'rouletteGameBtn'];
        gameButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    trackEvent('game_started', {
                        gameType: btnId.replace('GameBtn', ''),
                        balance: window.appState?.balance || 0
                    });
                });
            }
        });
    }
    
    // آمار عملکرد
    function trackPerformance() {
        if (window.performance && window.performance.timing) {
            const timing = window.performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
            
            trackEvent('performance', {
                loadTime,
                domReady,
                firstPaint: window.performance.getEntriesByType('paint')[0]?.startTime || 0
            });
        }
    }
    
    // گزارش خلاصه جلسه
    function generateSessionReport() {
        const sessionDuration = Date.now() - startTime;
        const storedEvents = JSON.parse(localStorage.getItem('finomax_analytics') || '[]');
        
        return {
            sessionId,
            userId,
            duration: sessionDuration,
            eventCount: storedEvents.length,
            device: getDeviceInfo(),
            page: getPageInfo(),
            timestamp: Date.now()
        };
    }
    
    // راه‌اندازی
    function initialize() {
        userId = generateUserId();
        
        // تنظیم ارسال دوره‌ای
        setInterval(flushEvents, ANALYTICS_CONFIG.flushInterval);
        
        // راه‌اندازی ردیابی خودکار
        setupAutoTracking();
        
        // ردیابی بازی‌ها
        document.addEventListener('DOMContentLoaded', () => {
            setupGameTracking();
            trackPerformance();
        });
        
        console.log('📊 Analytics initialized');
    }
    
    // API عمومی
    window.FinoMaxAnalytics = {
        track: trackEvent,
        flush: flushEvents,
        getSessionReport: generateSessionReport,
        config: ANALYTICS_CONFIG
    };
    
    // راه‌اندازی
    initialize();
    
})();
