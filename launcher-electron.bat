@echo off
setlocal
set "ELECTRON_RUN_AS_NODE="
cd /d "%~dp0"

set "ELECTRON_EXE=%~dp0node_modules\electron\dist\electron.exe"
if not exist "%ELECTRON_EXE%" (
  echo First run: installing Electron...
  npm install
)

start "" "%ELECTRON_EXE%" . launcher
exit /b 0
