@echo off
title Building Installer
echo.
echo ============================================
echo    Employee Monitor - Installer Builder
echo ============================================
echo.

:: Check if Inno Setup is installed
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
    set "ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
) else if exist "C:\Program Files\Inno Setup 6\ISCC.exe" (
    set "ISCC=C:\Program Files\Inno Setup 6\ISCC.exe"
) else (
    echo ERROR: Inno Setup 6 is not installed!
    echo.
    echo Please download and install from:
    echo https://jrsoftware.org/isdl.php
    echo.
    pause
    exit /b 1
)

:: Check if dist folder exists
if not exist "dist\EmployeeMonitor\EmployeeMonitor.exe" (
    echo ERROR: Agent exe not found!
    echo Please run build_exe.py first.
    echo.
    pause
    exit /b 1
)

echo Building installer...
echo.

"%ISCC%" installer.iss

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo    SUCCESS! Installer created at:
    echo    installer_output\ServiceSetup.exe
    echo ============================================
    echo.
) else (
    echo.
    echo ERROR: Build failed!
    echo.
)

pause
