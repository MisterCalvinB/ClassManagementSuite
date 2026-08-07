@echo off
setlocal
cd /d "%~dp0"
echo Building Windows Portable Executable...
npm run package:win-portable
pause
