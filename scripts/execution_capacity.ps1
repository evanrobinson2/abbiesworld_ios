# Windows execution-capacity worker — same cloud pull queue as the Mac sailboat.
# Usage:
#   .\scripts\execution_capacity.ps1 start
#   .\scripts\execution_capacity.ps1 stop
#   .\scripts\execution_capacity.ps1 status
#   .\scripts\execution_capacity.ps1 submit "PROMPT"
#   .\scripts\execution_capacity.ps1 install-login
# Auth: %USERPROFILE%\.abbies_world_token
$ErrorActionPreference = "Stop"

$RepoRoot = $null
if ($env:EXECUTION_CAPACITY_HOME -and (Test-Path $env:EXECUTION_CAPACITY_HOME)) {
    $AppRoot = $env:EXECUTION_CAPACITY_HOME
} elseif (Test-Path (Join-Path $PSScriptRoot "app.py")) {
    $AppRoot = $PSScriptRoot
} else {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    $AppRoot = Join-Path $RepoRoot "prototypes\execution-capacity"
}
$App = Join-Path $AppRoot "app.py"
$VenvPy = Join-Path $AppRoot ".venv\Scripts\python.exe"
$Port = if ($env:EXECUTION_CAPACITY_PORT) { $env:EXECUTION_CAPACITY_PORT } else { "8780" }
$Base = "http://127.0.0.1:$Port"
$TokenFile = Join-Path $env:USERPROFILE ".abbies_world_token"
$LogDir = Join-Path $env:LOCALAPPDATA "AbbiesWorld"
$Log = Join-Path $LogDir "execution-capacity.log"
$ErrLog = Join-Path $LogDir "execution-capacity.err.log"
$TaskName = "AbbiesWorldExecutionCapacity"

function Get-Token {
    if ($env:EXECUTION_CAPACITY_TOKEN) { return $env:EXECUTION_CAPACITY_TOKEN.Trim() }
    if (Test-Path $TokenFile) {
        return ((Get-Content $TokenFile -TotalCount 1) -replace "`r", "").Trim()
    }
    if ($env:ABBIES_WORLD_TOKEN) { return $env:ABBIES_WORLD_TOKEN.Trim() }
    return ""
}

function Test-Up {
    try {
        Invoke-WebRequest -Uri "$Base/health" -UseBasicParsing -TimeoutSec 1 | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Ensure-Venv {
    if (-not (Test-Path $VenvPy)) {
        Write-Host "creating venv at $AppRoot\.venv"
        $venvDir = Join-Path $AppRoot ".venv"
        if (Get-Command py -ErrorAction SilentlyContinue) {
            py -3 -m venv $venvDir
        } else {
            python -m venv $venvDir
        }
        & $VenvPy -m pip install -q -r (Join-Path $AppRoot "requirements-windows.txt")
    }
}

function Start-Worker {
    Ensure-Venv
    if (Test-Up) {
        Write-Host "ok: already up $Base"
        return
    }
    $busy = $false
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", [int]$Port)
        $tcp.Close()
        $busy = $true
    } catch {
        $busy = $false
    }
    if ($busy) {
        Write-Error "port $Port busy — refuse to pick another port"
        return
    }
    $token = Get-Token
    if (-not $token) {
        Write-Error "missing household token at $TokenFile"
        return
    }
    New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
    $env:EXECUTION_CAPACITY_TOKEN = $token
    if (-not $env:EXECUTION_CAPACITY_TRAY) { $env:EXECUTION_CAPACITY_TRAY = "1" }
    if (-not $env:EXECUTION_CAPACITY_OPEN) { $env:EXECUTION_CAPACITY_OPEN = "0" }
    if (-not $env:EXECUTION_CAPACITY_RESUME_ON_START) { $env:EXECUTION_CAPACITY_RESUME_ON_START = "1" }
    if (-not $env:EXECUTION_CAPACITY_HUMANIZE) { $env:EXECUTION_CAPACITY_HUMANIZE = "1" }
    if (-not $env:EXECUTION_CAPACITY_CLOUD_PULL) { $env:EXECUTION_CAPACITY_CLOUD_PULL = "1" }
    $proc = Start-Process -FilePath $VenvPy -ArgumentList @($App) -WorkingDirectory $AppRoot `
        -WindowStyle Hidden -RedirectStandardOutput $Log -RedirectStandardError $ErrLog -PassThru
    for ($i = 0; $i -lt 40; $i++) {
        if (Test-Up) {
            Write-Host "ok: started $Base (pid $($proc.Id))"
            Write-Host "tray: Midjourney sailboat in the notification area"
            Write-Host "chrome: dedicated profile logs in once at $env:LOCALAPPDATA\AbbiesWorld\execution-capacity-chrome"
            return
        }
        Start-Sleep -Milliseconds 250
    }
    Write-Error "did not come up — see $Log"
}

function Stop-Worker {
    if (Test-Up) {
        $t = Get-Token
        try {
            Invoke-WebRequest -Uri "$Base/v1/stop" -Method POST -Headers @{ Authorization = "Bearer $t" } `
                -ContentType "application/json" -Body "{}" -UseBasicParsing | Out-Null
        } catch { }
    }
    Get-CimInstance Win32_Process | Where-Object {
        $_.CommandLine -and $_.CommandLine -like "*execution-capacity*app.py*"
    } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Write-Host "ok: stopped process (Scheduled Task may restart if install-login is active)"
}

function Show-Status {
    if (Test-Up) {
        Write-Host "helper: up ($Base)"
        (Invoke-WebRequest -Uri "$Base/health" -UseBasicParsing).Content
    } else {
        Write-Host "helper: down"
    }
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($task) { Write-Host "login: installed ($TaskName)" } else { Write-Host "login: not installed" }
}

function Submit-Prompt([string]$Prompt, [string]$Id) {
    if (-not $Prompt) { Write-Error "prompt required"; return }
    Start-Worker | Out-Null
    $t = Get-Token
    Invoke-WebRequest -Uri "$Base/v1/resume" -Method POST -Headers @{ Authorization = "Bearer $t" } `
        -ContentType "application/json" -Body "{}" -UseBasicParsing | Out-Null
    $payload = @{ capability = "midjourney.imagine"; payload = @{ prompt = $Prompt } }
    if ($Id) { $payload.id = $Id }
    $body = $payload | ConvertTo-Json -Compress -Depth 5
    (Invoke-WebRequest -Uri "$Base/v1/jobs" -Method POST -Headers @{ Authorization = "Bearer $t" } `
        -ContentType "application/json" -Body $body -UseBasicParsing).Content
}

function Install-Login {
    Ensure-Venv
    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$PSCommandPath`" start"
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "ok: installed always-on login task $TaskName"
}

function Uninstall-Login {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "ok: removed login task $TaskName"
}

$op = $args[0]
switch ($op) {
    "start" { Start-Worker }
    "stop" { Stop-Worker }
    "status" { Show-Status }
    "submit" { Submit-Prompt $args[1] $args[2] }
    "open" { Start-Worker; Start-Process "$Base/" }
    "install-login" { Install-Login }
    "uninstall-login" { Uninstall-Login }
    default {
        Write-Host @"
Usage:
  .\scripts\execution_capacity.ps1 start
  .\scripts\execution_capacity.ps1 stop
  .\scripts\execution_capacity.ps1 status
  .\scripts\execution_capacity.ps1 submit "PROMPT" [job-id]
  .\scripts\execution_capacity.ps1 open
  .\scripts\execution_capacity.ps1 install-login
  .\scripts\execution_capacity.ps1 uninstall-login

Auth: $TokenFile
Dedicated Chrome profile (CDP :9222): %LOCALAPPDATA%\AbbiesWorld\execution-capacity-chrome
Doc: docs\architecture\EXECUTION_CAPACITY.md
"@
    }
}
