# ========================================
# Buddy Client Review Sync Script
# WSL -> Windows Sync Tool
# ========================================
#
# 用法: 双击同目录的 .bat 启动器，不要直接双击此文件
#

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = "E:\buddy-client"

$Source = "\\wsl.localhost\Ubuntu-24.04\home\openclaw\.openclaw\workspace-main\buddy-client"
$Target = $ProjectRoot

$LogDir  = Join-Path $ScriptDir "logs"
$StageDir = Join-Path $ScriptDir "stage"
$LockFile = Join-Path $StageDir "sync.lock"

# Create directories
if (!(Test-Path $LogDir))    { New-Item -ItemType Directory -Path $LogDir    | Out-Null }
if (!(Test-Path $StageDir))  { New-Item -ItemType Directory -Path $StageDir  | Out-Null }
if (!(Test-Path $Target))    { New-Item -ItemType Directory -Path $Target    | Out-Null }

# Source check
if (!(Test-Path $Source)) {
    Write-Host "Source path not found:" -ForegroundColor Red
    Write-Host $Source -ForegroundColor Red
    Pause
    exit 1
}

# Lock check
if (Test-Path $LockFile) {
    Write-Host "Sync already running. Lock file exists." -ForegroundColor Yellow
    Pause
    exit 1
}

New-Item $LockFile -ItemType File | Out-Null

$Time     = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$LogFile  = Join-Path $LogDir "sync-$Time.log"

Write-Host "========================================"
Write-Host " Buddy Client Review Sync Start"
Write-Host "========================================"
Write-Host "Source : $Source"
Write-Host "Target : $Target"
Write-Host "Log    : $LogFile"
Write-Host ""

try {
    robocopy $Source $Target /E /XO /XD ".git" "node_modules" "dist" "build" ".next" ".turbo" ".vite" ".nuxt" "coverage" ".expo" /R:2 /W:2 /FFT /Z /NP /TEE /LOG:$LogFile
    $RoboCode = $LASTEXITCODE

    Write-Host ""
    if ($RoboCode -le 7) {
        Write-Host "Sync completed successfully. (Robocopy exit: $RoboCode)" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "Sync failed. Check log: $LogFile" -ForegroundColor Red
        exit $RoboCode
    }
}
catch {
    Write-Host "Sync exception:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
finally {
    if (Test-Path $LockFile) { Remove-Item $LockFile -Force }
}

Write-Host "Done."
Pause
