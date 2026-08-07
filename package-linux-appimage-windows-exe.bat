@echo off
setlocal
cd /d "%~dp0"

set "SCRIPT=%~dp0package-linux-appimage-windows-exe.ps1"
if not exist "%SCRIPT%" (
  echo Could not find "%SCRIPT%"
  exit /b 1
)

where pwsh >nul 2>nul
if %ERRORLEVEL%==0 (
  pwsh -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
)

exit /b %ERRORLEVEL%