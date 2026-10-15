param([string]$Executable='D:/EPIC/UE_5.4/Engine/Binaries/Win64/UnrealEditor.exe',[switch]$Packaged,[string]$Project='')
$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$outputBase=Join-Path $taskRoot 'Evidence'
$project=if($Project){$Project}else{Join-Path $taskRoot 'Project/PotionMeadow.uproject'}
foreach($tier in 0,1,2,3) {
    $label=@('easy','medium','hard','menu')[$tier]
    $folder=Join-Path $outputBase ('QA-'+$label)
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
    $result=Join-Path $folder $(if($tier -eq 3){'menu-controls-qa.txt'}else{'cliff-playthrough.txt'})
    if(Test-Path -LiteralPath $result){Remove-Item -LiteralPath $result}
    $flag=if($tier -eq 3){'-PMMenuQA'}else{"-PMBoardQA -PMTier=$tier"}
    $prefix=if($Packaged){''}else{'"'+$project+'" '}
    $arguments=$prefix+'/Game/PotionMeadow/Maps/L_PM_CliffMeadow -game -RenderOffscreen -unattended -nosplash -nosound -windowed -ForceRes -ResX=1280 -ResY=960 -ExecCmds=DisableAllScreenMessages '+$flag+' "-PMCaptureDir='+$folder.Replace('\','/')+'" "-abslog='+($taskRoot+'/work/qa-'+$label+'.log').Replace('\','/')+'"'
    Write-Output "Starting $label live playthrough"
    $child=Start-Process -FilePath $Executable -ArgumentList $arguments -WindowStyle Hidden -PassThru
    if(-not $child.WaitForExit(240000)){Stop-Process -Id $child.Id;throw "$label timed out"}
    if(-not (Test-Path -LiteralPath $result)){throw "$label did not write a passing result; see work/qa-$label.log"}
    $report=Get-Content -LiteralPath $result -Raw
    if(-not $report.StartsWith('PASS:')){throw $report}
    Write-Output $report
}
