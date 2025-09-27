// سیستم مانیتورینگ و هشدار FinoMax
(function() {
    'use strict';
    
    const MONITORING_CONFIG = {
        enabled: true,
        alertThreshold: {
            errorRate: 0.05, // 5% خطا
            responseTime: 3000, // 3 ثانیه
            memoryUsage: 50 * 1024 * 1024, // 50MB
            crashCount: 3 // 3 کرش در 5 دقیقه
        },
        checkInterval: 30000, // 30 ثانیه
        reportInterval: 300000 // 5 دقیقه
    };
    
    let metrics = {
        errors: [],
        performance: [],
        memory: [],
        crashes: [],
        userActions: []
    };
    
    // مانیتورینگ خطاها
    function monitorErrors() {
        window.addEventListener('error', (e) => {
            const error = {
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno,
                stack: e.error?.stack,
                timestamp: Date.now(),
                url: window.location.href
            };
            
            metrics.errors.push(error);
            
            // هشدار فوری برای خطاهای حیاتی
            if (isCriticalError(error)) {
                sendAlert('critical_error', error);
            }
            
            // ردیابی در آنالیتیکس
            if (window.FinoMaxAnalytics) {
                window.FinoMaxAnalytics.track('error_occurred', error);
            }
        });
        
        // خطاهای Promise
        window.addEventListener('unhandledrejection', (e) => {
            const error = {
                reason: e.reason?.toString(),
                stack: e.reason?.stack,
                timestamp: Date.now(),
                type: 'unhandled_promise_rejection'
            };
            
            metrics.errors.push(error);
            
            if (window.FinoMaxAnalytics) {
                window.FinoMaxAnalytics.track('promise_rejection', error);
            }
        });
    }
    
    // مانیتورینگ عملکرد
    function monitorPerformance() {
        setInterval(() => {
            const perf = {
                timestamp: Date.now(),
                memory: getMemoryUsage(),
                timing: getPerformanceTiming(),
                fps: getFPS()
            };
            
            metrics.performance.push(perf);
            
            // بررسی آستانه‌ها
            checkPerformanceThresholds(perf);
            
            // نگه‌داشتن فقط ۱۰۰ رکورد آخر
            if (metrics.performance.length > 100) {
                metrics.performance.shift();
            }
        }, MONITORING_CONFIG.checkInterval);
    }
    
    // دریافت استفاده از حافظه
    function getMemoryUsage() {
        if (window.performance && window.performance.memory) {
            return {
                used: window.performance.memory.usedJSHeapSize,
                total: window.performance.memory.totalJSHeapSize,
                limit: window.performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }
    
    // دریافت اطلاعات timing
    function getPerformanceTiming() {
        if (window.performance && window.performance.timing) {
            const timing = window.performance.timing;
            return {
                loadTime: timing.loadEventEnd - timing.navigationStart,
                domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
                firstByte: timing.responseStart - timing.navigationStart
            };
        }
        return null;
    }
    
    // محاسبه FPS
    let fpsCounter = 0;
    let lastFpsTime = Date.now();
    
    function getFPS() {
        const now = Date.now();
        const delta = now - lastFpsTime;
        
        if (delta >= 1000) {
            const fps = Math.round((fpsCounter * 1000) / delta);
            fpsCounter = 0;
            lastFpsTime = now;
            return fps;
        }
        
        fpsCounter++;
        return null;
    }
    
    // بررسی آستانه‌های عملکرد
    function checkPerformanceThresholds(perf) {
        // بررسی حافظه
        if (perf.memory && perf.memory.used > MONITORING_CONFIG.alertThreshold.memoryUsage) {
            sendAlert('high_memory_usage', {
                used: perf.memory.used,
                threshold: MONITORING_CONFIG.alertThreshold.memoryUsage
            });
        }
        
        // بررسی زمان پاسخ
        if (perf.timing && perf.timing.loadTime > MONITORING_CONFIG.alertThreshold.responseTime) {
            sendAlert('slow_response_time', {
                loadTime: perf.timing.loadTime,
                threshold: MONITORING_CONFIG.alertThreshold.responseTime
            });
        }
    }
    
    // تشخیص خطاهای حیاتی
    function isCriticalError(error) {
        const criticalPatterns = [
            /cannot read property/i,
            /undefined is not a function/i,
            /network error/i,
            /script error/i
        ];
        
        return criticalPatterns.some(pattern => 
            pattern.test(error.message)
        );
    }
    
    // ارسال هشدار
    function sendAlert(type, data) {
        const alert = {
            type,
            data,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        console.warn('🚨 Alert:', alert);
        
        // ارسال به سرور مانیتورینگ
        fetch('/api/alerts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(alert)
        }).catch(error => {
            console.error('❌ Failed to send alert:', error);
        });
        
        // ذخیره محلی
        const alerts = JSON.parse(localStorage.getItem('finomax_alerts') || '[]');
        alerts.push(alert);
        
        // نگه‌داشتن فقط ۵۰ هشدار آخر
        if (alerts.length > 50) {
            alerts.shift();
        }
        
        localStorage.setItem('finomax_alerts', JSON.stringify(alerts));
    }
    
    // گزارش سلامت سیستم
    function generateHealthReport() {
        const now = Date.now();
        const last5Minutes = now - (5 * 60 * 1000);
        
        const recentErrors = metrics.errors.filter(e => e.timestamp > last5Minutes);
        const recentPerf = metrics.performance.filter(p => p.timestamp > last5Minutes);
        
        const errorRate = recentErrors.length / Math.max(metrics.userActions.length, 1);
        const avgMemory = recentPerf.reduce((sum, p) => sum + (p.memory?.used || 0), 0) / recentPerf.length;
        
        return {
            timestamp: now,
            errorRate,
            errorCount: recentErrors.length,
            avgMemoryUsage: avgMemory,
            performanceScore: calculatePerformanceScore(recentPerf),
            status: getSystemStatus(errorRate, avgMemory)
        };
    }
    
    // محاسبه امتیاز عملکرد
    function calculatePerformanceScore(perfData) {
        if (perfData.length === 0) return 100;
        
        const avgLoadTime = perfData.reduce((sum, p) => sum + (p.timing?.loadTime || 0), 0) / perfData.length;
        const avgFps = perfData.reduce((sum, p) => sum + (p.fps || 60), 0) / perfData.length;
        
        let score = 100;
        
        // کاهش امتیاز بر اساس زمان لود
        if (avgLoadTime > 2000) score -= 20;
        else if (avgLoadTime > 1000) score -= 10;
        
        // کاهش امتیاز بر اساس FPS
        if (avgFps < 30) score -= 30;
        else if (avgFps < 45) score -= 15;
        
        return Math.max(0, score);
    }
    
    // تعیین وضعیت سیستم
    function getSystemStatus(errorRate, memoryUsage) {
        if (errorRate > 0.1 || memoryUsage > 100 * 1024 * 1024) {
            return 'critical';
        } else if (errorRate > 0.05 || memoryUsage > 50 * 1024 * 1024) {
            return 'warning';
        } else {
            return 'healthy';
        }
    }
    
    // راه‌اندازی گزارش‌گیری دوره‌ای
    function setupPeriodicReporting() {
        setInterval(() => {
            const report = generateHealthReport();
            
            // ارسال گزارش
            fetch('/api/health', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(report)
            }).catch(error => {
                console.error('❌ Failed to send health report:', error);
            });
            
            // ردیابی در آنالیتیکس
            if (window.FinoMaxAnalytics) {
                window.FinoMaxAnalytics.track('health_report', report);
            }
            
        }, MONITORING_CONFIG.reportInterval);
    }
    
    // راه‌اندازی
    function initialize() {
        if (!MONITORING_CONFIG.enabled) return;
        
        monitorErrors();
        monitorPerformance();
        setupPeriodicReporting();
        
        console.log('🔍 Monitoring system initialized');
    }
    
    // API عمومی
    window.FinoMaxMonitoring = {
        getHealthReport: generateHealthReport,
        getMetrics: () => metrics,
        sendAlert: sendAlert,
        config: MONITORING_CONFIG
    };
    
    // راه‌اندازی
    initialize();
    
})();
