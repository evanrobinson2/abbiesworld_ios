# Remove the per-user worker. Keeps the dedicated Chrome profile (Midjourney login).
$ErrorActionPreference = "Stop"
$InstallRoot = Join-Path $env:LOCALAPPDATA "AbbiesWorld\execution-capacity"
$TaskName = "AbbiesWorldExecutionCapacity"
$StartMenu = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Abbie's World"
$ps1 = Join-Path $InstallRoot "execution_capacity.ps1"

if (Test-Path $ps1) {
    try { & $ps1 stop } catch { }
}
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $StartMenu -Recurse -Force -ErrorAction SilentlyContinue
if (Test-Path $InstallRoot) {
    Remove-Item -LiteralPath $InstallRoot -Recurse -Force
}
Write-Host "ok: uninstalled worker files and login task"
Write-Host "kept Chrome profile (if any): $env:LOCALAPPDATA\AbbiesWorld\execution-capacity-chrome"
Write-Host "kept token (if any): $env:USERPROFILE\.abbies_world_token"
