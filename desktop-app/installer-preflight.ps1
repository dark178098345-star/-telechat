# Read-only preflight embedded in both NSIS installer and uninstaller.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
function Finish($code, $reason) { [Console]::Out.WriteLine('EXSTRA_PREFLIGHT:' + $reason); exit $code }
try {
  $raw = $env:EXSTRACHAT_PREFLIGHT_DIRECTORY
  if (-not $raw -or -not [IO.Path]::IsPathRooted($raw)) { Finish 23 'invalid-directory' }
  $root = [IO.Path]::GetFullPath($raw).TrimEnd('\')
  if ($root -eq [IO.Path]::GetPathRoot($root).TrimEnd('\')) { Finish 23 'invalid-directory' }
  if (-not [IO.Directory]::Exists($root)) { Finish 0 'fresh-install' }
  $prefix = $root + '\'
  $files = New-Object 'Collections.Generic.List[string]'
  $queue = New-Object 'Collections.Generic.Queue[string]'
  $queue.Enqueue($root)
  while ($queue.Count) {
    foreach ($entry in [IO.Directory]::GetFileSystemEntries($queue.Dequeue())) {
      $full = [IO.Path]::GetFullPath($entry)
      $attr = [IO.File]::GetAttributes($full)
      if (-not $full.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) -or ($attr -band [IO.FileAttributes]::ReparsePoint)) { Finish 23 'unsafe-directory' }
      if ($attr -band [IO.FileAttributes]::Directory) { $queue.Enqueue($full) }
      elseif ([IO.Path]::GetFileName($full) -ne 'Uninstall ExstraChat.exe') { $files.Add($full) }
      if ($files.Count + $queue.Count -gt 4096) { Finish 23 'unexpected-directory-size' }
    }
  }
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class ExstraFileAccess {
 [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
 public static extern SafeFileHandle CreateFile(string p, uint a, uint s, IntPtr sa, uint c, uint f, IntPtr t);
}
'@
  $wait = 12000
  if ($env:EXSTRACHAT_PREFLIGHT_WAIT_MS -match '^\d+$') { $wait = [Math]::Min(20000, [int]$env:EXSTRACHAT_PREFLIGHT_WAIT_MS) }
  $deadline = [DateTime]::UtcNow.AddMilliseconds($wait)
  do {
    $code = 0
    foreach ($p in Get-CimInstance -ClassName Win32_Process -ErrorAction Stop) {
      if ($p.ExecutablePath -and $p.ExecutablePath.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) -and [IO.Path]::GetFileName($p.ExecutablePath) -ne 'Uninstall ExstraChat.exe') { $code = 20; break }
    }
    if (-not $code) {
      foreach ($file in $files) {
        # DELETE access checks rename permission/sharing; it does not delete.
        $handle = [ExstraFileAccess]::CreateFile($file, 0x10000, 7, [IntPtr]::Zero, 3, 0, [IntPtr]::Zero)
        if ($handle.IsInvalid) {
          $errorCode = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
          $handle.Dispose()
          if ($errorCode -notin 2,3) { $code = 21; break }
        } else { $handle.Dispose() }
      }
    }
    if (-not $code) { Finish 0 'ready' }
    if ([DateTime]::UtcNow -ge $deadline) { break }
    Start-Sleep -Milliseconds 400
  } while ($true)
  if ($code -eq 20) { Finish 20 'application-open' }
  Finish 21 'files-locked-or-no-access'
} catch { Finish 22 'preflight-unavailable' }
