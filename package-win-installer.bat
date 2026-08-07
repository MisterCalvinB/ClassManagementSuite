@echo off
setlocal
cd /d "%~dp0"
echo Building Windows NSIS Installer...
npm run package:win-installer
pause
