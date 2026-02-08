@echo off
:: ============================================================
::  EMPLOYEE MONITOR - ADMIN PANEL INSTALLER
::  Version 1.0
:: ============================================================

title Employee Monitor - Admin Panel Installer
color 0B

:: ===== CONFIGURATION =====
set "PANEL_PORT=3847"
set "PANEL_NAME=EmployeeMonitorPanel"
:: =========================

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
    pause
    exit /b 1
)

:MENU
cls
echo.
echo  ============================================================
echo       EMPLOYEE MONITOR - ADMIN PANEL INSTALLER
echo  ============================================================
echo.
echo   This will run on: http://localhost:%PANEL_PORT%
echo   Agents connect to: ws://YOUR_IP:%PANEL_PORT%/ws
echo.
echo  ============================================================
echo.
echo   [1] Install / Setup Panel
echo   [2] Start Panel
echo   [3] Start Panel (Electron App)
echo   [4] Configure Firewall (allow agents to connect)
echo   [5] Check Status
echo   [6] Exit
echo.
set /p choice="  Select option (1-6): "

if "%choice%"=="1" goto INSTALL
if "%choice%"=="2" goto START_SERVER
if "%choice%"=="3" goto START_ELECTRON
if "%choice%"=="4" goto FIREWALL
if "%choice%"=="5" goto STATUS
if "%choice%"=="6" exit /b 0
goto MENU

:INSTALL
cls
echo.
echo  ============================================================
echo       INSTALLING ADMIN PANEL
echo  ============================================================
echo.

set "SOURCE_DIR=%~dp0"

echo  [1/5] Checking Node.js...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo   ERROR: Node.js is not installed!
    echo.
    echo   Download from: https://nodejs.org/
    echo   Install the LTS version.
    echo.
    pause
    goto MENU
)
for /f "tokens=1" %%i in ('node --version 2^>^&1') do echo         Found Node.js %%i

echo  [2/5] Checking npm...
call npm --version >nul 2>&1
if %errorLevel% neq 0 (
    echo   ERROR: npm not found!
    pause
    goto MENU
)
for /f "tokens=1" %%i in ('npm --version 2^>^&1') do echo         Found npm %%i

echo  [3/5] Installing dependencies...
cd /d "%SOURCE_DIR%"
call npm install --silent 2>nul
if %errorLevel% neq 0 (
    echo         Warning: Some packages may have issues.
    echo         Trying with --force...
    call npm install --force --silent 2>nul
)
echo         Dependencies installed.

echo  [4/5] Rebuilding native modules...
call npm rebuild better-sqlite3 --silent 2>nul
echo         Native modules rebuilt.

echo  [5/5] Creating start scripts...

:: Create start script
(
echo @echo off
echo cd /d "%SOURCE_DIR%"
echo echo Starting Admin Panel on http://localhost:%PANEL_PORT%
echo echo Press Ctrl+C to stop
echo node server/index.js
) > "%SOURCE_DIR%start_server.bat"

:: Create Electron start script
(
echo @echo off
echo cd /d "%SOURCE_DIR%"
echo echo Starting Electron Admin Panel...
echo call npm start
) > "%SOURCE_DIR%start_electron.bat"

echo         Start scripts created.

echo.
echo  ============================================================
echo       INSTALLATION COMPLETE!
echo  ============================================================
echo.
echo   To start the panel:
echo     - Option 2: Web server (http://localhost:%PANEL_PORT%)
echo     - Option 3: Electron app (desktop window)
echo.
echo   Don't forget to configure firewall (Option 4) to allow
echo   agents from other PCs to connect!
echo.
echo  ============================================================
echo.
pause
goto MENU

:START_SERVER
cls
echo.
echo  Starting Admin Panel (Web Server)...
echo  URL: http://localhost:%PANEL_PORT%
echo.
echo  Press Ctrl+C to stop.
echo.
cd /d "%~dp0"
node server/index.js
pause
goto MENU

:START_ELECTRON
cls
echo.
echo  Starting Admin Panel (Electron App)...
echo.
cd /d "%~dp0"

:: Check if electron is for current node version
call npm rebuild better-sqlite3 --silent 2>nul

call npm start
pause
goto MENU

:FIREWALL
cls
echo.
echo  ============================================================
echo       CONFIGURING FIREWALL
echo  ============================================================
echo.
echo  This will allow agents from other PCs to connect.
echo.

echo  [1/2] Removing old rules...
netsh advfirewall firewall delete rule name="%PANEL_NAME%" >nul 2>&1
netsh advfirewall firewall delete rule name="%PANEL_NAME% Inbound" >nul 2>&1
echo         Done.

echo  [2/2] Adding inbound rule for port %PANEL_PORT%...
netsh advfirewall firewall add rule name="%PANEL_NAME% Inbound" dir=in action=allow protocol=tcp localport=%PANEL_PORT% >nul 2>&1
if %errorLevel%==0 (
    echo         Firewall rule added successfully!
) else (
    echo         Failed to add firewall rule.
)

echo.
echo  ============================================================
echo       FIREWALL CONFIGURED
echo  ============================================================
echo.
echo   Agents can now connect to this PC on port %PANEL_PORT%
echo.
echo   Your IP addresses:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do echo      %%a
echo.
echo   Update agent's SERVER_IP to one of these addresses.
echo.
echo  ============================================================
echo.
pause
goto MENU

:STATUS
cls
echo.
echo  ============================================================
echo       ADMIN PANEL STATUS
echo  ============================================================
echo.

echo  Checking Node.js...
node --version >nul 2>&1
if %errorLevel%==0 (
    for /f "tokens=1" %%i in ('node --version 2^>^&1') do echo         Node.js: %%i
) else (
    echo         Node.js: NOT INSTALLED
)

echo.
echo  Checking if panel is running...
netstat -ano | findstr ":%PANEL_PORT%" | findstr "LISTENING" >nul 2>&1
if %errorLevel%==0 (
    echo         Panel: RUNNING on port %PANEL_PORT%
) else (
    echo         Panel: NOT RUNNING
)

echo.
echo  Checking firewall...
netsh advfirewall firewall show rule name="%PANEL_NAME% Inbound" >nul 2>&1
if %errorLevel%==0 (
    echo         Firewall: OPEN (agents can connect)
) else (
    echo         Firewall: CLOSED (run Option 4 to open)
)

echo.
echo  Checking dependencies...
if exist "%~dp0node_modules" (
    echo         node_modules: INSTALLED
) else (
    echo         node_modules: NOT INSTALLED (run Option 1)
)

echo.
echo  Your IP addresses (for agents to connect):
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do echo        %%a

echo.
echo  ============================================================
echo.
pause
goto MENU
