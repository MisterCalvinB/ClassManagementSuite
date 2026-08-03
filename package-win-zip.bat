@echo off
setlocal
cd /d "%~dp0"
echo Building Windows ZIP Archive...
npm run package:win-zip
pause
