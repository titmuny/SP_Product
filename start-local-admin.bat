@echo off
setlocal
cd /d "%~dp0"
title SP Product Admin

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install the LTS version from https://nodejs.org then run this file again.
  pause
  exit /b 1
)
where git >nul 2>nul
if errorlevel 1 (
  echo WARNING: Git was not found. You can edit SP products locally, but "Publish to GitHub" will not work
  echo until Git for Windows is installed from https://git-scm.com
  echo.
)

set "SP_ADMIN_PORT=4177"
node local-admin\server.js
echo.
echo The SP product dashboard has stopped.
pause
