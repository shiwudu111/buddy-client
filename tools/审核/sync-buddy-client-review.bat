@echo off
REM ========================================
REM Buddy Client Review Sync - Launcher
REM ========================================
REM 解决 CMD.EXE 不支持 UNC 路径作当前目录的问题
REM 统一入口：通过本 .bat 启动，不要直接运行 .ps1

cd /d "%TEMP%"

powershell -ExecutionPolicy Bypass -File "%~dp0sync-buddy-client-review.ps1"

pause
