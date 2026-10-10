@echo off
setlocal
title WisQuiz - Cloudflare multiplayer setup
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Setup-Cloudflare.ps1" %*
set "setup_result=%ERRORLEVEL%"
echo.
pause
exit /b %setup_result%
