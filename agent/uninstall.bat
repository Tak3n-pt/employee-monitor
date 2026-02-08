@echo off
:: Employee Monitor Agent - Uninstaller
:: Must run as Administrator

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Run as Administrator!
    pause
    exit /b 1
)

echo ============================================
echo   Employee Monitor Agent - Uninstaller
echo ============================================
echo.

set "INSTALL_DIR=C:\Program Files\EmployeeMonitor"
set "AGENT_NAME=EmployeeMonitor"

echo [1/5] Stopping agent...
taskkill /F /IM pythonw.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo        Agent stopped.

echo [2/5] Removing auto-start...
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\%AGENT_NAME%.lnk" >nul 2>&1
echo        Auto-start removed.

echo [3/5] Removing firewall rule...
netsh advfirewall firewall delete rule name="%AGENT_NAME%" >nul 2>&1
echo        Firewall rule removed.

echo [4/5] Removing Defender exclusions...
powershell -Command "Remove-MpPreference -ExclusionPath '%INSTALL_DIR%' -ErrorAction SilentlyContinue" >nul 2>&1
echo        Exclusions removed.

echo [5/5] Deleting files...
rmdir /S /Q "%INSTALL_DIR%" >nul 2>&1
echo        Files deleted.

echo.
echo ============================================
echo   Uninstallation Complete!
echo ============================================
echo.
timeout /t 5
