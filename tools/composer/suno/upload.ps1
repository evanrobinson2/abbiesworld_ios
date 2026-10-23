# Uploads Evan's Suno downloads (~\Claude\suno\library, each with a .json sidecar naming its Suno id) to our R2 CDN
# through presigned PUT URLs filled in by .github/workflows/suno-presign.yml. Never commit a filled-in copy.
$L = Join-Path $HOME 'Claude\suno\library'
$u = @{
#URLS#
}
$ok = 0
$side = Get-ChildItem $L -Filter *.json | Where-Object Name -ne 'index.json'
foreach ($id in @($u.Keys)) {
  $f = $null
  $j = $side | Where-Object { (Get-Content $_.FullName -Raw) -match $id } | Select-Object -First 1
  if ($j) {
    $f = Join-Path $L ($j.BaseName + '.mp3')
    if (-not (Test-Path -LiteralPath $f)) {
      $m = [regex]::Match((Get-Content $j.FullName -Raw), '"([^"\\]+\.mp3)"')
      $f = if ($m.Success) { Join-Path $L (Split-Path $m.Groups[1].Value -Leaf) } else { $null }
    }
  }
  if (-not $f -or -not (Test-Path -LiteralPath $f)) { $f = (Get-ChildItem $L -Filter "*$id*.mp3" | Select-Object -First 1).FullName }
  if ($f -and (Test-Path -LiteralPath $f)) {
    try { Invoke-WebRequest -Uri $u[$id] -Method Put -InFile $f -ContentType 'audio/mpeg' -UseBasicParsing | Out-Null; $ok++ }
    catch { Write-Host "Couldn't upload $id" }
  } else { Write-Host "No file for $id" }
}
Write-Host "Uploaded $ok of $($u.Count) songs to Abbie's World."
