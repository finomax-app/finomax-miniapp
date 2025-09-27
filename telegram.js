// تنظیمات مخصوص تلگرام مینی‌اپ
(function() {
    console.log('🚀 Loading Telegram Mini App...');
    
    // بررسی محیط تلگرام
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        console.log('✅ Telegram WebApp detected');
        
        // تنظیم ظاهر
        tg.setHeaderColor('#1a1a3a');
        tg.setBackgroundColor('#0a0a1a');
        
        // دریافت اطلاعات کاربر تلگرام
        const user = tg.initDataUnsafe?.user;
        console.log('👤 User data:', user);
        
        if (user) {
            // صبر تا appState آماده شود
            const initUserData = () => {
                if (typeof appState !== 'undefined') {
                    // ذخیره اطلاعات کاربر
                    appState.telegramUser = {
                        id: user.id,
                        firstName: user.first_name,
                        lastName: user.last_name,
                        username: user.username,
                        languageCode: user.language_code,
                        isPremium: user.is_premium || false
                    };
                    
                    // تنظیم زبان بر اساس کاربر
                    if (user.language_code) {
                        const langMap = {
                            'fa': 'fa',
                            'ar': 'ar',
                            'es': 'es',
                            'fr': 'fr',
                            'de': 'de',
                            'ru': 'ru',
                            'pt': 'pt',
                            'hi': 'hi',
                            'zh': 'zh'
                        };
                        
                        if (langMap[user.language_code] && typeof currentLanguage !== 'undefined') {
                            currentLanguage = langMap[user.language_code];
                            const langSelector = document.getElementById('languageSelector');
                            if (langSelector) {
                                langSelector.value = currentLanguage;
                                if (typeof updateTranslations === 'function') {
                                    updateTranslations();
                                }
                            }
                        }
                    }
                    
                    // نمایش نام کاربر
                    setTimeout(() => {
                        const welcomeElement = document.querySelector('[data-translate="welcome"]');
                        if (welcomeElement) {
                            welcomeElement.textContent = `خوش آمدید ${user.first_name}`;
                        }
                    }, 1000);
                    
                    console.log('✅ User data initialized');
                } else {
                    // تلاش مجدد پس از ۵۰۰ میلی‌ثانیه
                    setTimeout(initUserData, 500);
                }
            };
            
            initUserData();
        }
        
        // تنظیم دکمه اصلی تلگرام
        tg.MainButton.setText('💰 دریافت پاداش');
        tg.MainButton.color = '#ffd700';
        tg.MainButton.textColor = '#000000';
        
        // عملکرد دکمه اصلی
        tg.MainButton.onClick(() => {
            if (typeof appState !== 'undefined' && appState.balance > 0) {
                tg.showAlert(`💰 موجودی شما: ${appState.balance.toFixed(6)} USDT`);
                tg.HapticFeedback.notificationOccurred('success');
            } else {
                tg.showAlert('🎯 برای کسب درآمد، استخراج را شروع کنید!');
                tg.HapticFeedback.notificationOccurred('warning');
            }
        });
        
        // نمایش دکمه اصلی
        tg.MainButton.show();
        
        // دکمه بازگشت
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            tg.close();
        });
        
        // تنظیم دکمه تنظیمات
        tg.SettingsButton.show();
        tg.SettingsButton.onClick(() => {
            if (typeof showPage === 'function') {
                showPage('wallet');
            }
        });
        
        // ارسال داده به ربات
        function sendDataToBot(action, data) {
            const payload = {
                action: action,
                data: data,
                user_id: user?.id,
                timestamp: Date.now()
            };
            tg.sendData(JSON.stringify(payload));
            console.log('📤 Data sent to bot:', payload);
        }
        
        // رویدادهای سفارشی
        document.addEventListener('DOMContentLoaded', () => {
            // رویداد شروع استخراج
            const miningCircle = document.getElementById('miningCircle');
            if (miningCircle) {
                miningCircle.addEventListener('click', () => {
                    setTimeout(() => {
                        if (typeof appState !== 'undefined') {
                            sendDataToBot('mining_started', { 
                                balance: appState.balance,
                                timestamp: Date.now()
                            });
                            tg.HapticFeedback.impactOccurred('medium');
                        }
                    }, 100);
                });
            }
            
            // رویداد بازی‌ها
            const gameButtons = document.querySelectorAll('[id$="GameBtn"]');
            gameButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    tg.HapticFeedback.impactOccurred('light');
                });
            });
            
            // رویداد تکمیل تسک
            document.addEventListener('click', (e) => {
                if (e.target.textContent.includes('Claim') || e.target.textContent.includes('دریافت')) {
                    setTimeout(() => {
                        sendDataToBot('task_completed', {
                            taskId: e.target.getAttribute('onclick') || 'unknown',
                            timestamp: Date.now()
                        });
                        tg.HapticFeedback.notificationOccurred('success');
                    }, 100);
                }
            });
        });
        
        // تابع برای نمایش اعلان‌های تلگرام
        function showTelegramNotification(message, type = 'info') {
            if (type === 'success') {
                tg.showAlert(`✅ ${message}`);
                tg.HapticFeedback.notificationOccurred('success');
            } else if (type === 'error') {
                tg.showAlert(`❌ ${message}`);
                tg.HapticFeedback.notificationOccurred('error');
            } else {
                tg.showAlert(`ℹ️ ${message}`);
                tg.HapticFeedback.impactOccurred('light');
            }
        }
        
        // آماده‌سازی نهایی
        tg.ready();
        tg.expand();
        
        // اعلان آمادگی
        console.log('✅ Telegram Mini App initialized successfully');
        
        // ذخیره تابع‌ها برای استفاده جهانی
        window.telegramApp = {
            sendData: sendDataToBot,
            showAlert: (message) => tg.showAlert(message),
            showConfirm: (message) => tg.showConfirm(message),
            showNotification: showTelegramNotification,
            haptic: tg.HapticFeedback,
            user: user,
            webApp: tg
        };
        
        // اضافه کردن CSS برای تلگرام
        const telegramStyles = document.createElement('style');
        telegramStyles.textContent = `
            /* استایل‌های مخصوص تلگرام */
            body.telegram-app {
                user-select: none;
                -webkit-user-select: none;
                -webkit-touch-callout: none;
            }
            
            .telegram-button {
                background: var(--tg-theme-button-color, #3390ec);
                color: var(--tg-theme-button-text-color, #ffffff);
                border: none;
                border-radius: 8px;
                padding: 12px 24px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .telegram-button:hover {
                opacity: 0.8;
                transform: scale(0.98);
            }
            
            .telegram-card {
                background: var(--tg-theme-bg-color, rgba(255, 255, 255, 0.08));
                border: 1px solid var(--tg-theme-hint-color, rgba(255, 255, 255, 0.15));
            }
        `;
        document.head.appendChild(telegramStyles);
        
        // اضافه کردن کلاس به body
        document.body.classList.add('telegram-app');
        
    } else {
        console.log('⚠️ Not running in Telegram environment');
        
        // شبیه‌سازی محیط تلگرام برای تست
        window.telegramApp = {
            sendData: (data) => console.log('📤 Mock data:', data),
            showAlert: (message) => alert(message),
            showConfirm: (message) => confirm(message),
            showNotification: (message, type) => console.log(`${type}: ${message}`),
            haptic: {
                impactOccurred: (style) => console.log(`Haptic: ${style}`),
                notificationOccurred: (type) => console.log(`Notification: ${type}`)
            },
            user: null,
            webApp: null
        };
    }
})();
