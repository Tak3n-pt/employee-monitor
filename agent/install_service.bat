@echo off
setlocal EnableDelayedExpansion

echo ============================================
echo Employee Monitor Service Installer
echo ============================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script requires administrator privileges.
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

:: Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

:: Check for NSSM
where nssm >nul 2>&1
if %errorLevel% neq 0 (
    echo NSSM not found in PATH. Checking local directory...
    if exist "%SCRIPT_DIR%\nssm.exe" (
        set "NSSM=%SCRIPT_DIR%\nssm.exe"
    ) else (
        echo.
        echo ERROR: NSSM (Non-Sucking Service Manager) not found.
        echo Please download NSSM from https://nssm.cc and place nssm.exe in this folder.
        echo Or add NSSM to your system PATH.
        pause
        exit /b 1
    )
) else (
    set "NSSM=nssm"
)

:: Get server parameters
set "SERVER_HOST=localhost"
set "SERVER_PORT=3847"

if not "%~1"=="" set "SERVER_HOST=%~1"
if not "%~2"=="" set "SERVER_PORT=%~2"

echo Server: %SERVER_HOST%:%SERVER_PORT%
echo.

:: Check if service already exists
%NSSM% status EmployeeMonitor >nul 2>&1
if %errorLevel% equ 0 (
    echo Service already exists. Stopping and removing...
    %NSSM% stop EmployeeMonitor >nul 2>&1
    %NSSM% remove EmployeeMonitor confirm >nul 2>&1
    timeout /t 2 >nul
)

:: Find Python or use compiled exe
if exist "%SCRIPT_DIR%\dist\EmployeeMonitor.exe" (
    set "APP_PATH=%SCRIPT_DIR%\dist\EmployeeMonitor.exe"
    set "APP_ARGS=--server %SERVER_HOST% --port %SERVER_PORT%"
    echo Using compiled executable: !APP_PATH!
) else (
    where pythonw >nul 2>&1
    if %errorLevel% equ 0 (
        for /f "delims=" %%i in ('where pythonw') do set "PYTHON_PATH=%%i"
    ) else (
        where python >nul 2>&1
        if %errorLevel% equ 0 (
            for /f "delims=" %%i in ('where python') do set "PYTHON_PATH=%%i"
        ) else (
            echo ERROR: Python not found. Please install Python or use compiled exe.
            pause
            exit /b 1
        )
    )
    set "APP_PATH=!PYTHON_PATH!"
    set "APP_ARGS=%SCRIPT_DIR%\main.py --server %SERVER_HOST% --port %SERVER_PORT%"
    echo Using Python: !PYTHON_PATH!
)

:: Create logs directory
if not exist "%SCRIPT_DIR%\logs" mkdir "%SCRIPT_DIR%\logs"

:: Install service
echo.
echo Installing Employee Monitor Service...
%NSSM% install EmployeeMonitor "%APP_PATH%"
if %errorLevel% neq 0 (
    echo ERROR: Failed to install service
    pause
    exit /b 1
)

:: Configure service parameters
%NSSM% set EmployeeMonitor AppParameters "%APP_ARGS%"
%NSSM% set EmployeeMonitor AppDirectory "%SCRIPT_DIR%"
%NSSM% set EmployeeMonitor DisplayName "Employee Monitor Agent"
%NSSM% set EmployeeMonitor Description "Monitors employee activity and reports to admin panel"
%NSSM% set EmployeeMonitor Start SERVICE_AUTO_START
%NSSM% set EmployeeMonitor AppStdout "%SCRIPT_DIR%\logs\service.log"
%NSSM% set EmployeeMonitor AppStderr "%SCRIPT_DIR%\logs\error.log"
%NSSM% set EmployeeMonitor AppRotateFiles 1
%NSSM% set EmployeeMonitor AppRotateBytes 1048576

:: Start service
echo Starting service...
%NSSM% start EmployeeMonitor

:: Check status
timeout /t 2 >nul
%NSSM% status EmployeeMonitor

echo.
echo ============================================
echo Service installed successfully!
echo.
echo The service will start automatically on boot.
echo Logs are stored in: %SCRIPT_DIR%\logs\
echo ============================================
pause
