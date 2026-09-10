@echo off
setlocal
title BridgePoint Local AI Setup
echo.
echo ============================================
echo   BridgePoint Local AI - Windows Setup
echo ============================================
echo.
set "PS1=%TEMP%\bridgepoint_install_local_ai.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/live-artifact/downloads/local-ai/install_windows.ps1' -OutFile '%PS1%'"
if errorlevel 1 goto :fail
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
if errorlevel 1 goto :fail
echo.
echo BridgePoint Local AI setup completed.
pause
exit /b 0
:fail
echo.
echo BridgePoint Local AI setup did not complete. Review the message above.
pause
exit /b 1
