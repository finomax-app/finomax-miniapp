// تنظیمات مخصوص تلگرام مینی‌اپ
(function() {
    // بررسی محیط تلگرام
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        
        // تنظیم ظاهر
        tg.setHeaderColor('#1a1a3a');
        tg.setBackgroundColor('#0a0a1a');
        
        // دریافت اطلاعات کاربر تلگرام
        const user = tg.initDataUnsafe?.user;
        if (user) {
            // ذخیره اطلاعات کاربر
            if (typeof appState !== 'undefined') {
                appState.telegramUser = {
                    id: user.id,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    username: user.username,
                    languageCode: user.language_code
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
                    
                    if (langMap[user.language_code]) {
                        currentLanguage = langMap[user.language_code];
                        document.getElementById('languageSelector').value = currentLanguage;
                        updateTranslations();
                    }
                }
                
                // نمایش نام کاربر
                const welcomeElement = document.querySelector('[data-translate="welcome"]');
                if (welcomeElement) {
                    welcomeElement.textContent = `خوش آمدید ${user.first_name}`;
                }
            }
        }
        
        // تنظیم دکمه اصلی تلگرام
        tg.MainButton.setText('💰 دریافت پاداش');
        tg.MainButton.color = '#ffd700';
        tg.MainButton.textColor = '#000000';
        
        // نمایش دکمه اصلی
        tg.MainButton.show();
        
        // عملکرد دکمه اصلی
        tg.MainButton.onClick(() => {
            if (typeof appState !== 'undefined' && appState.balance > 0) {
                tg.showAlert(`💰 موجودی شما: ${appState.balance.toFixed(6)} USDT`);
            } else {
                tg.showAlert('🎯 برای کسب درآمد، استخراج را شروع کنید!');
            }
        });
        
        // دکمه بازگشت
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            tg.close();
        });
        
        // تنظیم دکمه تنظیمات
        tg.SettingsButton.show();
        tg.SettingsButton.onClick(() => {
            showPage('wallet');
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
        }
        
        // رویدادهای مخصوص
        document.addEventListener('miningStarted', () => {
            sendDataToBot('mining_started', { balance: appState.balance });
            tg.HapticFeedback.impactOccurred('medium');
        });
        
        document.addEventListener('gameWon', (e) => {
            sendDataToBot('game_won', e.detail);
            tg.HapticFeedback.notificationOccurred('success');
        });
        
        document.addEventListener('taskCompleted', (e) => {
            sendDataToBot('task_completed', e.detail);
            tg.HapticFeedback.notificationOccurred('success');
        });
        
        // آماده‌سازی نهایی
        tg.ready();
        tg.expand();
        
        // اعلان آمادگی
        console.log('✅ Telegram Mini App initialized successfully');
        
        // ذخیره تابع برای استفاده جهانی
        window.telegramApp = {
            sendData: sendDataToBot,
            showAlert: (message) => tg.showAlert(message),
            showConfirm: (message) => tg.showConfirm(message),
            haptic: tg.HapticFeedback,
            user: user
        };
        
    } else {
        console.log('⚠️ Not running in Telegram environment');
    }
})();
