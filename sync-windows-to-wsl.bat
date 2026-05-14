@echo off
setlocal

set "DISTRO=Ubuntu-24.04"
set "SCRIPT=/mnt/e/buddy-client/tools/sync-windows-to-wsl.sh"
set "LOG_FILE=/tmp/buddy-client-sync/sync-windows-to-wsl.log"

echo Syncing E:\buddy-client to WSL client workspace...
wsl.exe -d %DISTRO% -- sh "%SCRIPT%"

if errorlevel 1 (
  echo.
  echo Sync failed. Please check the messages above.
  pause
  exit /b 1
)

echo.
echo Client sync finished successfully.
echo WSL log: %LOG_FILE%
echo.
pause
