@echo off
setlocal
cd /d "%~dp0"
echo Building macOS Application (Intel x64)...
npm run package:mac
pause
