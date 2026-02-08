@echo off
:: ============================================================
::  EMPLOYEE MONITOR - AGENT INSTALLER
::  Version 1.0
:: ============================================================
:: Run as Administrator
:: Before running: Add exclusion in your AV for:
::   C:\Program Files\EmployeeMonitor
:: ============================================================

title Employee Monitor - Agent Installer
color 0A

:: ===== CONFIGURATION =====
set "SERVER_PORT=3847"
set "INSTALL_DIR=C:\Program Files\EmployeeMonitor"
set "AGENT_NAME=EmployeeMonitor"
set "SERVER_IP="
:: ===========================

:: Check admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo.
    echo  ============================================
    echo   ERROR: ADMINISTRATOR RIGHTS REQUIRED
    echo  ============================================
    echo.
    echo   Right-click this file and select:
    echo   "Run as administrator"
    echo.
    echo  ============================================
    echo.
    pause
    exit /b 1
)

:MENU
cls
echo.
echo  ============================================================
echo       EMPLOYEE MONITOR - AGENT INSTALLER
echo  ============================================================
echo.
if "%SERVER_IP%"=="" (
    echo   Server: [Not configured]
) else (
    echo   Server: %SERVER_IP%:%SERVER_PORT%
)
echo   Install to: %INSTALL_DIR%
echo.
echo  ============================================================
echo.
echo   IMPORTANT: Before installing, add AV exclusion for:
echo   %INSTALL_DIR%
echo.
echo  ============================================================
echo.
echo   [1] Configure Server Connection
echo   [2] Install Agent
echo   [3] Uninstall Agent
echo   [4] Check Status
echo   [5] Exit
echo.
set /p choice="  Select option (1-5): "

if "%choice%"=="1" goto CONFIGURE
if "%choice%"=="2" goto INSTALL
if "%choice%"=="3" goto UNINSTALL
if "%choice%"=="4" goto STATUS
if "%choice%"=="5" exit /b 0
goto MENU

:CONFIGURE
cls
echo.
echo  ============================================================
echo       CONFIGURE SERVER CONNECTION
echo  ============================================================
echo.
echo   Enter the name or IP of the PC running the Admin Panel.
echo.
echo   Examples:
echo     - Computer name: ADMIN-PC, OFFICE-PC, DESKTOP-ABC123
echo     - IP address:    192.168.1.100
echo     - Domain:        monitor.yourdomain.com
echo.
echo   To find the admin PC name, run 'hostname' on that PC.
echo.
echo  ============================================================
echo.
set /p SERVER_IP="  Enter server address: "

if "%SERVER_IP%"=="" (
    echo.
    echo   ERROR: Server address cannot be empty!
    pause
    goto MENU
)

echo.
echo   Testing connection to %SERVER_IP%:%SERVER_PORT%...
ping -n 1 %SERVER_IP% >nul 2>&1
if %errorLevel%==0 (
    echo   Connection: OK - Server is reachable
) else (
    echo   Connection: WARNING - Cannot ping server
    echo   The server may still work if ping is blocked.
)
echo.
pause
goto MENU

:INSTALL
cls
echo.
echo  ============================================================
echo       INSTALLING EMPLOYEE MONITOR AGENT
echo  ============================================================
echo.

:: Check if server is configured
if "%SERVER_IP%"=="" (
    echo   ERROR: Server not configured!
    echo.
    echo   Please select Option 1 first to configure the server address.
    echo.
    pause
    goto MENU
)

set "SOURCE_DIR=%~dp0"

echo  [1/9] Checking Python...
python --version >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo   ERROR: Python is not installed!
    echo.
    echo   Download from: https://www.python.org/downloads/
    echo   Make sure to check "Add Python to PATH" during install.
    echo.
    pause
    goto MENU
)
for /f "tokens=2" %%i in ('python --version 2^>^&1') do echo         Found Python %%i

echo  [2/9] Stopping existing agent...
taskkill /F /IM pythonw.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo         Done.

echo  [3/9] Creating install directory...
if exist "%INSTALL_DIR%" rmdir /S /Q "%INSTALL_DIR%" >nul 2>&1
mkdir "%INSTALL_DIR%" >nul 2>&1
mkdir "%INSTALL_DIR%\monitors" >nul 2>&1
mkdir "%INSTALL_DIR%\utils" >nul 2>&1
mkdir "%INSTALL_DIR%\logs" >nul 2>&1
mkdir "%INSTALL_DIR%\data" >nul 2>&1
echo         Created %INSTALL_DIR%

echo  [4/9] Copying files...
xcopy "%SOURCE_DIR%*.py" "%INSTALL_DIR%\" /Y /Q >nul 2>&1
xcopy "%SOURCE_DIR%requirements.txt" "%INSTALL_DIR%\" /Y /Q >nul 2>&1
xcopy "%SOURCE_DIR%monitors\*.py" "%INSTALL_DIR%\monitors\" /Y /Q >nul 2>&1
xcopy "%SOURCE_DIR%utils\*.py" "%INSTALL_DIR%\utils\" /Y /Q >nul 2>&1
echo         Files copied.

echo  [5/9] Installing dependencies...
cd /d "%INSTALL_DIR%"
pip install -r requirements.txt -q --disable-pip-version-check >nul 2>&1
if %errorLevel% neq 0 (
    echo         Warning: Some dependencies may have failed.
) else (
    echo         Dependencies installed.
)

echo  [6/9] Configuring server connection...
powershell -Command "(Get-Content '%INSTALL_DIR%\config.py') -replace 'SERVER_HOST = \".*\"', 'SERVER_HOST = \"%SERVER_IP%\"' | Set-Content '%INSTALL_DIR%\config.py'" >nul 2>&1
powershell -Command "(Get-Content '%INSTALL_DIR%\config.py') -replace 'SERVER_PORT = \d+', 'SERVER_PORT = %SERVER_PORT%' | Set-Content '%INSTALL_DIR%\config.py'" >nul 2>&1
echo         Server: %SERVER_IP%:%SERVER_PORT%

echo  [7/9] Configuring Windows Defender...
powershell -Command "Add-MpPreference -ExclusionPath '%INSTALL_DIR%' -ErrorAction SilentlyContinue" >nul 2>&1
powershell -Command "Add-MpPreference -ExclusionProcess 'pythonw.exe' -ErrorAction SilentlyContinue" >nul 2>&1
echo         Exclusions added.

echo  [8/9] Configuring Firewall...
netsh advfirewall firewall delete rule name="%AGENT_NAME%" >nul 2>&1
netsh advfirewall firewall add rule name="%AGENT_NAME% Outbound" dir=out action=allow protocol=tcp remoteport=%SERVER_PORT% >nul 2>&1
echo         Firewall rule added.

echo  [9/9] Setting up auto-start...

:: Create silent launcher VBS
(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.CurrentDirectory = "%INSTALL_DIR%"
echo WshShell.Run "pythonw main.py --server %SERVER_IP% --port %SERVER_PORT%", 0, False
) > "%INSTALL_DIR%\start_hidden.vbs"

:: Create manual start batch
(
echo @echo off
echo cd /d "%INSTALL_DIR%"
echo start "" pythonw main.py --server %SERVER_IP% --port %SERVER_PORT%
) > "%INSTALL_DIR%\start.bat"

:: Create stop batch
(
echo @echo off
echo taskkill /F /IM pythonw.exe
echo echo Agent stopped.
echo timeout /t 2
) > "%INSTALL_DIR%\stop.bat"

:: Add to startup
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\%AGENT_NAME%.lnk'); $s.TargetPath = '%INSTALL_DIR%\start_hidden.vbs'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.WindowStyle = 7; $s.Save()" >nul 2>&1
echo         Auto-start enabled.

echo.
echo  Starting agent...
cscript //nologo "%INSTALL_DIR%\start_hidden.vbs" >nul 2>&1
timeout /t 3 /nobreak >nul

:: Verify running
tasklist /FI "IMAGENAME eq pythonw.exe" 2>nul | find /I "pythonw.exe" >nul
if %errorLevel%==0 (
    echo         Agent is running!
) else (
    echo         Warning: Agent may not have started. Check logs.
)

echo.
echo  ============================================================
echo       INSTALLATION COMPLETE!
echo  ============================================================
echo.
echo   Install Path: %INSTALL_DIR%
echo   Server:       %SERVER_IP%:%SERVER_PORT%
echo   Auto-start:   Enabled
echo   Status:       Running
echo.
echo   The agent is now monitoring this PC.
echo.
echo  ============================================================
echo.
pause
goto MENU

:: Silent install removed - use main install with server configured

:UNINSTALL
cls
echo.
echo  ============================================================
echo       UNINSTALLING EMPLOYEE MONITOR AGENT
echo  ============================================================
echo.

echo  [1/5] Stopping agent...
taskkill /F /IM pythonw.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo         Stopped.

echo  [2/5] Removing auto-start...
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\%AGENT_NAME%.lnk" >nul 2>&1
echo         Removed.

echo  [3/5] Removing firewall rules...
netsh advfirewall firewall delete rule name="%AGENT_NAME% Outbound" >nul 2>&1
netsh advfirewall firewall delete rule name="%AGENT_NAME%" >nul 2>&1
echo         Removed.

echo  [4/5] Removing Defender exclusions...
powershell -Command "Remove-MpPreference -ExclusionPath '%INSTALL_DIR%' -ErrorAction SilentlyContinue" >nul 2>&1
echo         Removed.

echo  [5/5] Deleting files...
rmdir /S /Q "%INSTALL_DIR%" >nul 2>&1
echo         Deleted.

echo.
echo  ============================================================
echo       UNINSTALLATION COMPLETE
echo  ============================================================
echo.
pause
goto MENU

:STATUS
cls
echo.
echo  ============================================================
echo       AGENT STATUS
echo  ============================================================
echo.

echo  Checking agent process...
tasklist /FI "IMAGENAME eq pythonw.exe" 2>nul | find /I "pythonw.exe" >nul
if %errorLevel%==0 (
    echo         Status: RUNNING
) else (
    echo         Status: NOT RUNNING
)

echo.
echo  Checking install directory...
if exist "%INSTALL_DIR%\main.py" (
    echo         Installed: YES
    echo         Path: %INSTALL_DIR%
) else (
    echo         Installed: NO
)

echo.
echo  Checking auto-start...
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\%AGENT_NAME%.lnk" (
    echo         Auto-start: ENABLED
) else (
    echo         Auto-start: DISABLED
)

echo.
echo  Checking firewall...
netsh advfirewall firewall show rule name="%AGENT_NAME% Outbound" >nul 2>&1
if %errorLevel%==0 (
    echo         Firewall rule: EXISTS
) else (
    echo         Firewall rule: NOT FOUND
)

echo.
echo  Server Configuration:
if "%SERVER_IP%"=="" (
    echo         [Not configured - use Option 1]
) else (
    echo         %SERVER_IP%:%SERVER_PORT%
)

echo.
echo  ============================================================
echo.
pause
goto MENU
