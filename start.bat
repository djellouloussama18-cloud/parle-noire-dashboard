@echo off
chcp 65001 >nul
title Parle Noire POS

echo ===================================
echo    Parle Noire POS
echo    نظام نقطة البيع الاحترافي
echo ===================================
echo.

REM التحقق من تثبيت Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [خطأ] Node.js غير مثبت على هذا الجهاز!
    echo يرجى تحميله من https://nodejs.org وتثبيته أولاً
    pause
    exit /b
)

echo [✓] Node.js موجود
echo [→] جاري تشغيل السيرفر...
echo.

REM تشغيل السيرفر في نافذة منفصلة
start "Parle Noire POS Server" cmd /k "cd /d %~dp0backend && node server.js"

REM الانتظار 3 ثوان
timeout /t 3 /nobreak >nul

REM فتح المتصفح تلقائياً
start http://localhost:3001

echo.
echo [✓] النظام يعمل الآن!
echo [✓] السيرفر سيفتح تلقائياً في متصفحك
echo.
echo لإيقاف النظام: أغلق نافذة السيرفر
echo.
pause
