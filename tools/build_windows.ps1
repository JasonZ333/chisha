# Build the Windows release of the ChiSha app.
#
# Steps:
#   1. Re-create NTFS junctions for Windows plugins (see make_plugin_junctions.ps1)
#      so Flutter never has to create a real symlink.
#   2. flutter build windows --release, output captured to a log file.
#   3. Report the produced exe.
#
# The whole project lives on D: so nothing needs to be published anywhere else,
# and so no build artifact ever ends up inside the DSH workspace (executables
# inside the workspace are confined by the DSH file sandbox).
#
# Note: flutter writes progress to stderr. With $ErrorActionPreference='Stop'
# PowerShell turns that into a terminating error, so the build is launched
# through cmd.exe with plain redirection instead.
#
# Keep ASCII-only: the DSH shell is Windows PowerShell 5.1 (ANSI code page).

$root = 'D:\chisha'
$proj = 'D:\chisha'
$fl = Join-Path $root 'tools\fl.cmd'
$log = 'D:\flutter\build.log'

Write-Host '=== [1/3] plugin junctions ===' -ForegroundColor Cyan
$jScript = [System.IO.File]::ReadAllText(
    (Join-Path $root 'tools\make_plugin_junctions.ps1'),
    [System.Text.Encoding]::UTF8)
& ([scriptblock]::Create($jScript))

Write-Host ''
Write-Host '=== [2/3] flutter build windows --release ===' -ForegroundColor Cyan
Push-Location $proj
try {
    cmd /c "`"$fl`" build windows --release > `"$log`" 2>&1"
    $code = $LASTEXITCODE
} finally {
    Pop-Location
}

Write-Host ''
Write-Host '--- build log (tail) ---'
if (Test-Path $log) {
    Get-Content $log -Encoding UTF8 | Select-Object -Last 25
}
Write-Host ''

Write-Host '=== [3/3] result ===' -ForegroundColor Cyan
$exe = Join-Path $proj 'build\windows\x64\runner\Release\chisha.exe'
if (Test-Path $exe) {
    $item = Get-Item $exe
    Write-Host ("BUILD OK  {0}" -f $exe) -ForegroundColor Green
    Write-Host ("   size     : {0:N1} MB" -f ($item.Length / 1MB))
    Write-Host ("   built at : {0}" -f $item.LastWriteTime)
    Write-Host '   release dir:'
    Get-ChildItem (Split-Path $exe) | ForEach-Object {
        Write-Host ("     " + $_.Name)
    }
    Write-Host ''
    Write-Host 'Run it by double-clicking:' -ForegroundColor Green
    Write-Host ("   {0}" -f $exe)
    Write-Host ''
    Write-Host 'Keep the whole Release folder together: chisha.exe needs the'
    Write-Host 'sibling data\ folder plus flutter_windows.dll and'
    Write-Host 'url_launcher_windows_plugin.dll.'
    exit 0
} else {
    Write-Host 'BUILD FAILED - exe not found' -ForegroundColor Red
    Write-Host ("flutter exit code: {0}" -f $code)
    exit 1
}
