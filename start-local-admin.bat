@echo off
setlocal
cd /d "%~dp0"
title SP Local Admin

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install the LTS version from https://nodejs.org then run this file again.
  pause
  exit /b 1
)
where git >nul 2>nul
if errorlevel 1 (
  echo WARNING: Git was not found. You can edit products, but "Publish to GitHub" will not work
  echo until Git for Windows is installed from https://git-scm.com
  echo.
)

node local-admin\server.js
echo.
echo The dashboard has stopped.
pause
