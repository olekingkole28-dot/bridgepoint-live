@echo off
setlocal
title BridgePoint Full Supabase Exit Rescue v941
set "PS1=%TEMP%\BridgePoint_Full_Rescue_v941.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/live-artifact/downloads/local-ai/Install_OneDrive_Full_Rescue_v941.ps1' -OutFile '%PS1%'"
if errorlevel 1 goto :fail
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
if errorlevel 1 goto :fail
echo.
echo BridgePoint full Supabase exit rescue v941 started.
pause
exit /b 0
:fail
echo.
echo BridgePoint full rescue v941 did not start. Review the message above.
pause
exit /b 1
