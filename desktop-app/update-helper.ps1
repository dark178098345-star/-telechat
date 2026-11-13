$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$job = $null
$mayRestart = $false
$failureReason = 'installer-failed'
$installerExitCode = $null
function Write-Result($ok) {
  if ($job) {
    @{ ok = $ok; version = $job.version; reason = $(if ($ok) { '' } else { $failureReason }); exitCode = $installerExitCode; at = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json -Compress | Set-Content -LiteralPath $job.result -Encoding UTF8
  }
}
function Check-Installer {
  $file = Get-Item -LiteralPath $job.installer
  $stream = [IO.File]::OpenRead($job.installer)
  $algorithm = [Security.Cryptography.SHA256]::Create()
  try { $hash = [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-', '').ToLowerInvariant() } finally { $stream.Dispose(); $algorithm.Dispose() }
  if ($file.Length -ne $job.size -or $hash -ne $job.sha256) { throw 'Installer verification failed' }
}
function Start-App {
  $target = Join-Path (Split-Path -Parent $job.exe) 'ExstraChat.exe'
  if (-not (Test-Path -LiteralPath $target)) { $target = $job.exe }
  if (Test-Path -LiteralPath $target) { Start-Process -FilePath $target -WindowStyle Hidden }
}
try {
  $job = $env:EXSTRACHAT_UPDATE_JOB | ConvertFrom-Json
  Remove-Item Env:EXSTRACHAT_UPDATE_JOB -ErrorAction SilentlyContinue
  Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
  if (-not $job -or $job.parent -le 0 -or $job.sha256 -notmatch '^[a-f0-9]{64}$') { throw 'Invalid update job' }
  $directory = [IO.Path]::GetFullPath($job.job).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
  if (-not [IO.Path]::GetFullPath($job.installer).StartsWith($directory, [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid installer path' }
  Check-Installer
  Set-Content -LiteralPath (Join-Path $job.job 'ready') -Value 'ready' -Encoding ASCII
  $deadline = [DateTime]::UtcNow.AddSeconds(10)
  while (-not (Test-Path -LiteralPath (Join-Path $job.job 'approved'))) {
    if ([DateTime]::UtcNow -gt $deadline) { exit 1 }
    Start-Sleep -Milliseconds 100
  }
  $deadline = [DateTime]::UtcNow.AddSeconds(45)
  while (Get-Process -Id $job.parent -ErrorAction SilentlyContinue) {
    if ([DateTime]::UtcNow -gt $deadline) { $failureReason = 'application-open'; throw 'Application did not close; update aborted' }
    Start-Sleep -Milliseconds 250
  }
  $mayRestart = $true
  Check-Installer
  $installDirectory = Split-Path -Parent $job.exe
  $process = Start-Process -FilePath $job.installer -ArgumentList @('--updated', '/S', ('/D=' + $installDirectory)) -WindowStyle Hidden -Wait -PassThru
  $installerExitCode = $process.ExitCode
  if ($installerExitCode -ne 0) {
    $failureReason = switch ($installerExitCode) { 20 { 'application-open' } 21 { 'files-busy' } 22 { 'preflight-unavailable' } default { 'installer-failed' } }
    throw 'Installer did not finish successfully'
  }
  Write-Result $true
  Start-App
} catch {
  [Console]::Error.WriteLine('ExstraChat update helper: ' + $_.Exception.Message)
  try { Write-Result $false; if ($job -and $mayRestart) { Start-App } } catch {}
  exit 1
} finally {
  if ($job -and $job.installer -and $directory -and [IO.Path]::GetFullPath($job.installer).StartsWith($directory, [StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $job.installer -ErrorAction SilentlyContinue
  }
}
