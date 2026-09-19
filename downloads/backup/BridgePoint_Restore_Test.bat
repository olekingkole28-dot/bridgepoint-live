@echo off
setlocal EnableExtensions
title BridgePoint Restore Test
echo.
echo ============================================
echo   BridgePoint Restore Test
echo ============================================
echo.
echo IMPORTANT: Use a TEST/EMPTY PostgreSQL database URL.
echo Never point this at production unless you deliberately intend to replace it.
echo.
set "PS1=%TEMP%\bridgepoint_restore_wizard.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/main/downloads/backup/bridgepoint_restore_wizard.ps1' -OutFile '%PS1%'"
if errorlevel 1 goto :fail
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
if errorlevel 1 goto :fail
echo.
echo BridgePoint restore test completed.
pause
exit /b 0
:fail
echo.
echo Restore test did not complete. Review the message above.
pause
exit /b 1
