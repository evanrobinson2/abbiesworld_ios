; Packager stages windows/payload/ as the zip folder (Install.ps1 + app\).
; iscc this file from prototypes/execution-capacity/windows/

#define MyAppName "Abbie's World Midjourney Worker"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Abbie's World"

[Setup]
AppId={{9E3C1B2A-7D4F-4A11-9C8E-ECWINWORKER0001}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\AbbiesWorld\execution-capacity
DisableDirPage=yes
PrivilegesRequired=lowest
OutputDir=output
OutputBaseFilename=AbbiesWorldExecutionCapacitySetup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName={#MyAppName}
ArchitecturesInstallIn64BitMode=x64compatible

[Files]
Source: "payload\*"; DestDir: "{tmp}\ec-payload"; Flags: ignoreversion recursesubdirs createallsubdirs

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{tmp}\ec-payload\Install.ps1"""; WorkingDir: "{tmp}\ec-payload"; Flags: waituntilterminated

