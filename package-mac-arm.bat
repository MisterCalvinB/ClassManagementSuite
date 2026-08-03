@echo off
setlocal
cd /d "%~dp0"
echo Building macOS Application (Apple Silicon ARM64)...
npm run package:mac-arm
pause
