@echo off
REM Flutter wrapper for the ChiSha project.
REM
REM All Flutter write locations are redirected to D: so they survive any
REM cleanup of the DSH workspace, and so nothing needs to live inside it.

set "FLUTTER_ROOT=D:\flutter"
set "FLUTTER_STORAGE_BASE_URL=https://storage.flutter-io.cn"
set "PUB_HOSTED_URL=https://pub.flutter-io.cn"
set "PUB_CACHE=D:\flutter\pub-cache"
set "APPDATA=D:\flutter\dsh-appdata\Roaming"
set "LOCALAPPDATA=D:\flutter\dsh-appdata\Local"
set "FLUTTER_SUPPRESS_ANALYTICS=true"
set "CI=true"
"D:\flutter\bin\flutter.bat" %*
