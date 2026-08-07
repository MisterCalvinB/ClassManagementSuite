@echo off
setlocal
cd /d "%~dp0"
echo Building Linux Directory (Unpacked) Output...
npm run package:linux-dir
pause
