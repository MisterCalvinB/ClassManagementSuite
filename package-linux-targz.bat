@echo off
setlocal
cd /d "%~dp0"
echo Building Linux tar.gz Archive...
npm run package:linux-targz
pause
