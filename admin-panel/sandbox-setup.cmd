@echo off
echo ========================================
echo   Employee Monitor - Sandbox Setup
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Node.js already installed!
    goto :start_app
)

echo Downloading Node.js...
cd C:\Users\WDAGUtilityAccount\Desktop
curl -L -o node-setup.msi https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi

if not exist "node-setup.msi" (
    echo Download failed! Trying alternative...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile 'node-setup.msi'"
)

echo Installing Node.js (please wait)...
msiexec /i node-setup.msi /qn /norestart

:: Wait for installation
echo Waiting for installation to complete...
timeout /t 10 /nobreak

:: Refresh PATH
set "PATH=%PATH%;C:\Program Files\nodejs"

:: Verify installation
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js installation failed!
    echo Please install Node.js manually from https://nodejs.org
    pause
    exit /b 1
)

echo Node.js installed successfully!
echo.

:start_app
echo Starting Admin Panel...
cd C:\employee-monitor\admin-panel

:: Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo.
echo ========================================
echo   Starting Electron App...
echo ========================================
call npm start

pause
