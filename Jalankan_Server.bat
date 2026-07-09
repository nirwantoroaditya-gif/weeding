@echo off
echo.
echo ====================================
echo  Galeri Pernikahan - Desy dan Wahyu
echo ====================================
echo.

:: Cek apakah Node.js terinstall
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js belum terinstall!
    echo.
    echo Silakan download dan install dari: https://nodejs.org
    echo Pilih versi LTS, lalu install dan jalankan file ini lagi.
    echo.
    pause
    exit /b
)

echo [OK] Node.js ditemukan.
echo.
echo Menghidupkan server...
echo.
echo Setelah muncul "Server berjalan!", buka browser dan ketik:
echo.
echo    http://localhost:3000
echo.
echo --------------------------------------------------------
echo Untuk buka di HP (HP dan Laptop harus 1 WiFi yang sama):
echo Ganti "localhost" dengan IP Laptop Anda.
echo Cara cari IP Laptop: buka CMD, ketik "ipconfig", cari IPv4.
echo --------------------------------------------------------
echo.

node "%~dp0server.js"
pause
