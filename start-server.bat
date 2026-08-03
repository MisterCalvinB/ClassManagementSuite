@echo off
setlocal
cd /d "%~dp0"
echo Starting Classroom & Quiz Server...
npm run server
if %ERRORLEVEL% neq 0 pause
