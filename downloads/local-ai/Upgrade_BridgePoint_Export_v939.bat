@echo off
setlocal
title BridgePoint Emergency Export Upgrade v939
set "PS1=%TEMP%\BridgePoint_Emergency_Upgrade_v939.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/live-artifact/downloads/local-ai/Emergency_Upgrade_v939.ps1' -OutFile '%PS1%'"
if errorlevel 1 goto :fail
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
if errorlevel 1 goto :fail
echo.
echo BridgePoint V939 rescue upgrade completed.
pause
exit /b 0
:fail
echo.
echo BridgePoint V939 rescue upgrade failed. Review the message above.
pause
exit /b 1
