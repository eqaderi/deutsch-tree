@echo off
rem Starts deutsch-tree on this computer. Double-click this file.
rem It runs server\serve.ps1 with Windows PowerShell 5.1, which ships with Windows 10
rem and Windows 11, on the app folder beside this file. Close the window to stop.
title deutsch-tree
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%~dp0server\serve.ps1" (
  echo.
  echo The "server" folder is missing next to this file.
  echo If this folder came as a zip file: right-click the zip, choose "Extract All",
  echo then double-click this file inside the extracted folder.
  echo.
  pause
  exit /b 1
)
if not exist "%PS%" (
  echo.
  echo Windows PowerShell was not found at %PS%
  echo Read instructions-en.html in this folder, under "If the app does not start".
  echo.
  pause
  exit /b 1
)
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0server\serve.ps1" -Root "%~dp0app"
echo.
echo The app has stopped. Press any key to close this window.
pause >nul
