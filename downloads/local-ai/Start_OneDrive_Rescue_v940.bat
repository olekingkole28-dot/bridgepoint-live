@echo off
setlocal
title BridgePoint OneDrive Rescue v940
set "PS1=%TEMP%\BridgePoint_OneDrive_Rescue_v940.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/live-artifact/downloads/local-ai/Install_OneDrive_Rescue_v940.ps1' -OutFile '%PS1%'"
if errorlevel 1 goto :fail
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
if errorlevel 1 goto :fail
echo.
echo BridgePoint OneDrive Rescue v940 started.
pause
exit /b 0
:fail
echo.
echo BridgePoint OneDrive Rescue v940 did not start. Review the message above.
pause
exit /b 1
