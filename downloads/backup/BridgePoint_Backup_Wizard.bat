@echo off
setlocal EnableExtensions
title BridgePoint Full Backup
echo.
echo ============================================
echo   BridgePoint Full Backup + Verification
echo ============================================
echo.
set "PS1=%TEMP%\bridgepoint_backup_wizard.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/olekingkole28-dot/bridgepoint-live/main/downloads/backup/bridgepoint_backup_wizard.ps1' -OutFile '%PS1%'"
if errorlevel 1 goto :fail
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
if errorlevel 1 goto :fail
echo.
echo BridgePoint backup and verification completed.
pause
exit /b 0
:fail
echo.
echo Backup did not complete. Review the message above.
pause
exit /b 1
