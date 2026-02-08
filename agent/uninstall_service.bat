@echo off
echo ============================================
echo Employee Monitor Service Uninstaller
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

:: Check for NSSM
where nssm >nul 2>&1
if %errorLevel% neq 0 (
    set "SCRIPT_DIR=%~dp0"
    if exist "%SCRIPT_DIR%nssm.exe" (
        set "NSSM=%SCRIPT_DIR%nssm.exe"
    ) else (
        echo ERROR: NSSM not found.
        pause
        exit /b 1
    )
) else (
    set "NSSM=nssm"
)

:: Check if service exists
%NSSM% status EmployeeMonitor >nul 2>&1
if %errorLevel% neq 0 (
    echo Service not found. Nothing to uninstall.
    pause
    exit /b 0
)

:: Stop and remove service
echo Stopping service...
%NSSM% stop EmployeeMonitor

echo Removing service...
%NSSM% remove EmployeeMonitor confirm

echo.
echo ============================================
echo Service removed successfully!
echo ============================================
pause
