@echo off
echo ========================================
echo Employee Monitor - Agent
echo ========================================
echo.

REM Default server IP
set SERVER=192.168.1.19
set PORT=3847

REM Check for command line arguments
if not "%1"=="" set SERVER=%1
if not "%2"=="" set PORT=%2

echo Connecting to server: %SERVER%:%PORT%
echo.

python main.py --server %SERVER% --port %PORT%

pause
