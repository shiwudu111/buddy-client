@echo off
cd /d %~dp0
powershell -ExecutionPolicy Bypass -File sync-buddy-client-review.ps1
pause
