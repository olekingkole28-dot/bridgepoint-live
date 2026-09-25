@echo off
setlocal
title BridgePoint Intelligence Desktop Node v938
echo.
echo ===============================================
echo   BridgePoint Intelligence Desktop Node v938
echo ===============================================
echo.
set "PS1=%TEMP%\bridgepoint_install_v938.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/0a8cd5020fe6712367b50579e17e4baf5bb25730/downloads/local-ai/install_windows.ps1' -OutFile '%PS1%'"
if errorlevel 1 goto :fail
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
if errorlevel 1 goto :fail
echo.
echo BridgePoint desktop node v938 setup completed.
pause
exit /b 0
:fail
echo.
echo BridgePoint desktop node setup did not complete. Review the message above.
pause
exit /b 1
