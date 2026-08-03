@echo off
setlocal
cd /d "%~dp0"
echo Starting Class Management Tools...
npm start
if %ERRORLEVEL% neq 0 pause
