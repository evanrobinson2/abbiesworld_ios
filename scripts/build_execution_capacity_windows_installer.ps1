# Windows installer packager — same zip as the Mac script.
$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$App = Join-Path $Root "prototypes\execution-capacity"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Out = Join-Path $Root "artifacts\execution-capacity-windows\$Stamp"
$Payload = Join-Path $Out "AbbiesWorldExecutionCapacity"
$AppDest = Join-Path $Payload "app"
New-Item -ItemType Directory -Force -Path $AppDest | Out-Null

Get-ChildItem $App | Where-Object {
    $_.Name -notin @(".venv", "data", "windows", "launchd", ".gitignore")
} | ForEach-Object {
    Copy-Item $_.FullName $AppDest -Recurse -Force
}
Get-ChildItem $AppDest -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $Root "scripts\execution_capacity.ps1") (Join-Path $AppDest "execution_capacity.ps1") -Force
Copy-Item (Join-Path $App "windows\Install.ps1") (Join-Path $Payload "Install.ps1") -Force
Copy-Item (Join-Path $App "windows\Uninstall.ps1") (Join-Path $Payload "Uninstall.ps1") -Force
Copy-Item (Join-Path $App "windows\AbbiesWorldExecutionCapacity.iss") (Join-Path $Payload "AbbiesWorldExecutionCapacity.iss") -Force

$Readme = @"
Abbie's World — Midjourney worker (Windows)

1. Extract this folder anywhere.
2. Right-click Install.ps1 → Run with PowerShell
3. Paste the household token if prompted (Studio → Copy MCP token).
4. Sign into Midjourney once in the dedicated Chrome window.
5. Leave the sailboat in the notification area.

Uninstall: Uninstall.ps1
Port 8780 must be free.
"@
Set-Content -Path (Join-Path $Payload "README.txt") -Value $Readme -Encoding utf8

$Zip = Join-Path $Out "AbbiesWorldExecutionCapacity.zip"
if (Test-Path $Zip) { Remove-Item $Zip -Force }
Compress-Archive -Path $Payload -DestinationPath $Zip
$Latest = Join-Path $Root "artifacts\execution-capacity-windows\latest"
if (Test-Path $Latest) { Remove-Item $Latest -Recurse -Force }
New-Item -ItemType Junction -Path $Latest -Target $Out | Out-Null
Write-Host "ok: $Zip"

$iscc = Get-Command iscc -ErrorAction SilentlyContinue
if ($iscc) {
    $issDir = Join-Path $App "windows"
    $issPayload = Join-Path $issDir "payload"
    if (Test-Path $issPayload) { Remove-Item $issPayload -Recurse -Force }
    Copy-Item $Payload $issPayload -Recurse -Force
    & iscc (Join-Path $issDir "AbbiesWorldExecutionCapacity.iss")
    Write-Host "ok: Inno Setup compiled"
} else {
    Write-Host "note: ISCC.exe not on PATH — zip+Install.ps1 is the installer"
}
