# Per-user installer for the Abbie's World Midjourney worker (Windows).
# Does not need admin. Installs to %LOCALAPPDATA%\AbbiesWorld\execution-capacity
# Pair: Mac uses scripts/execution_capacity.sh install-login
$ErrorActionPreference = "Stop"

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$Payload = Join-Path $Here "app"
if (-not (Test-Path (Join-Path $Payload "app.py"))) {
    throw "installer payload missing app\app.py (run the packager, not this file alone)"
}

$InstallRoot = Join-Path $env:LOCALAPPDATA "AbbiesWorld\execution-capacity"
$TokenFile = Join-Path $env:USERPROFILE ".abbies_world_token"
$TaskName = "AbbiesWorldExecutionCapacity"
$StartMenu = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Abbie's World"

function Find-Python {
    foreach ($cmd in @("py", "python", "python3")) {
        $hit = Get-Command $cmd -ErrorAction SilentlyContinue
        if ($hit) { return $hit.Source }
    }
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\Python\Python313\python.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\Python\Python311\python.exe")
    )
    foreach ($p in $candidates) {
        if (Test-Path $p) { return $p }
    }
    return $null
}

function Ensure-Python {
    $py = Find-Python
    if ($py) { return $py }
    Write-Host "Python 3 not found — installing Python.Python.3.12 for this user via winget"
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "Python 3 is required. Install from https://www.python.org/downloads/windows/ then re-run Install.ps1"
    }
    winget install -e --id Python.Python.3.12 --scope user --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "User") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $py = Find-Python
    if (-not $py) {
        throw "Python installed but not on PATH yet — open a new PowerShell and re-run Install.ps1"
    }
    return $py
}

function Ensure-Token {
    if ($env:ABBIES_WORLD_TOKEN) {
        $env:ABBIES_WORLD_TOKEN.Trim() | Set-Content -Path $TokenFile -Encoding ascii -NoNewline
        Write-Host "ok: wrote household token to $TokenFile"
        return
    }
    if (Test-Path $TokenFile) {
        $existing = ((Get-Content $TokenFile -TotalCount 1) -replace "`r", "").Trim()
        if ($existing) {
            Write-Host "ok: using existing token $TokenFile"
            return
        }
    }
    Write-Host "Paste the household Auth0 token (Studio → Copy MCP token). Blank skips (worker will not start until the file exists)."
    $typed = Read-Host "Token"
    if ($typed) {
        $typed.Trim() | Set-Content -Path $TokenFile -Encoding ascii -NoNewline
        Write-Host "ok: wrote $TokenFile"
    }
}

$Python = Ensure-Python
New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
Write-Host "copying worker → $InstallRoot"
Copy-Item -Path (Join-Path $Payload "*") -Destination $InstallRoot -Recurse -Force
$ps1 = Join-Path $InstallRoot "execution_capacity.ps1"
if (-not (Test-Path $ps1)) { throw "execution_capacity.ps1 missing from payload" }

Ensure-Token

$env:EXECUTION_CAPACITY_HOME = $InstallRoot
$venvPy = Join-Path $InstallRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPy)) {
    Write-Host "creating venv"
    if ((Split-Path -Leaf $Python) -eq "py.exe" -or $Python -eq "py") {
        & py -3 -m venv (Join-Path $InstallRoot ".venv")
    } else {
        & $Python -m venv (Join-Path $InstallRoot ".venv")
    }
}
& $venvPy -m pip install -q -U pip
& $venvPy -m pip install -q -r (Join-Path $InstallRoot "requirements-windows.txt")

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ps1`" start"
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

New-Item -ItemType Directory -Force -Path $StartMenu | Out-Null
$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut((Join-Path $StartMenu "Midjourney Worker.lnk"))
$lnk.TargetPath = "powershell.exe"
$lnk.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$ps1`" start"
$lnk.WorkingDirectory = $InstallRoot
$lnk.WindowStyle = 7
$lnk.Description = "Abbie's World execution-capacity worker"
$ico = Join-Path $InstallRoot "assets\abbies.ico"
if (Test-Path $ico) { $lnk.IconLocation = $ico }
$lnk.Save()

$open = $shell.CreateShortcut((Join-Path $StartMenu "Worker status.lnk"))
$open.TargetPath = "powershell.exe"
$open.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$ps1`" open"
$open.WorkingDirectory = $InstallRoot
$open.Save()

Start-ScheduledTask -TaskName $TaskName
Write-Host "ok: installed $InstallRoot"
Write-Host "login task: $TaskName"
Write-Host "next: sign into Midjourney once in the dedicated Chrome profile"
Write-Host "  $env:LOCALAPPDATA\AbbiesWorld\execution-capacity-chrome"
Write-Host "then: $ps1 status"
