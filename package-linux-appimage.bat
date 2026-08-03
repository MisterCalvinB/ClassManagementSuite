@echo off
setlocal
cd /d "%~dp0"
echo Building Linux AppImage Executable...
npm run package:linux-appimage
pause
