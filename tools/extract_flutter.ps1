# 解压 Flutter SDK 到 D:\flutter
param(
    # 已下载的 Flutter SDK 压缩包；默认取系统临时目录（与 download_flutter.mjs 对应）
    [string]$Zip = (Join-Path (Join-Path $env:TEMP 'flutter-download') 'flutter.zip')
)
$ErrorActionPreference = 'Stop'
$OutputEncoding = [Console]::OutputEncoding = [Text.Encoding]::UTF8

$dest = 'D:\'
$flutterBat = 'D:\flutter\bin\flutter.bat'

if (Test-Path $flutterBat) {
    Write-Host "[跳过] D:\flutter 已存在"
} else {
    if (-not (Test-Path $zip)) { throw "找不到 $zip" }
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Write-Host "[1/3] 解压到 D:\ ... (约 1.8 GB，请稍候)"
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    & tar.exe -xf $zip -C $dest
    if ($LASTEXITCODE -ne 0) { throw "tar 解压失败，ExitCode=$LASTEXITCODE" }
    $sw.Stop()
    Write-Host ("[2/3] 解压完成，用时 {0:N0} 秒" -f $sw.Elapsed.TotalSeconds)
}

if (-not (Test-Path $flutterBat)) { throw "解压后仍找不到 $flutterBat" }

$size = (Get-ChildItem 'D:\flutter' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
Write-Host ("[3/3] D:\flutter 就绪，占用 {0:N0} MB" -f ($size / 1MB))

# 解压成功后删除压缩包，回收 C 盘空间
if (Test-Path $zip) {
    Remove-Item $zip -Force
    Write-Host "[清理] 已删除 flutter.zip，回收 1845 MB"
}

Write-Host "FLUTTER_BAT=$flutterBat"
