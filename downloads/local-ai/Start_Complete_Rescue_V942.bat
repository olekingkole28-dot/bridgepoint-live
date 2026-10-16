@echo off
setlocal
title BridgePoint Complete Supabase Exit Rescue V942
set "PS1=%TEMP%\BridgePoint_Complete_Rescue_V942.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/live-artifact/downloads/local-ai/Install_OneDrive_Complete_Rescue_v942.ps1' -OutFile '%PS1%'"
if errorlevel 1 goto fail
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
if errorlevel 1 goto fail
echo.
echo BridgePoint Complete Rescue V942 started.
pause
exit /b 0
:fail
echo.
echo V942 did not start. Review the message above.
pause
exit /b 1
