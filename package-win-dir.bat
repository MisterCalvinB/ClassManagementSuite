@echo off
setlocal
cd /d "%~dp0"
echo Building Windows Directory (Unpacked) Output...
npm run package:win-dir
pause
