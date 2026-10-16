# Create NTFS directory junctions for Windows plugins, standing in for the
# symlinks Flutter would otherwise create.
#
# Why: flutter_plugins.dart:1272 skips link creation when the link already
# exists, and _createPlatformPluginSymlinks is only forced (force: true) when
# the plugin list actually changed (flutter_plugins.dart:1332). Junctions do
# not need Administrator rights or Developer Mode on Windows, and Dart still
# reports them as a Link whose existsSync() is true.
#
# Keep this file ASCII-only: the DSH shell is Windows PowerShell 5.1 and reads
# scripts using the ANSI code page.

$ErrorActionPreference = 'Stop'

$proj = 'D:\chisha'
$depsFile = Join-Path $proj '.flutter-plugins-dependencies'
$linkDir = Join-Path $proj 'windows\flutter\ephemeral\.plugin_symlinks'

if (-not (Test-Path $depsFile)) {
    Write-Host "ERROR: $depsFile not found. Run 'flutter pub get' first."
    exit 1
}

$raw = [System.IO.File]::ReadAllText($depsFile, [System.Text.Encoding]::UTF8)
$json = $raw | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path $linkDir | Out-Null

$ok = 0
$fail = 0
foreach ($plugin in $json.plugins.windows) {
    $name = $plugin.name
    $target = $plugin.path.TrimEnd('\')
    $link = Join-Path $linkDir $name

    if (Test-Path $link) {
        Remove-Item $link -Recurse -Force -ErrorAction SilentlyContinue
    }

    cmd /c mklink /J "$link" "$target" > $null 2>&1

    if (Test-Path $link) {
        Write-Host ("  OK   {0,-24} -> {1}" -f $name, $target)
        $ok++
    } else {
        Write-Host ("  FAIL {0,-24} -> {1}" -f $name, $target)
        $fail++
    }
}

Write-Host ""
Write-Host "plugin junctions: $ok ok, $fail failed"
if ($fail -gt 0) { exit 1 }
