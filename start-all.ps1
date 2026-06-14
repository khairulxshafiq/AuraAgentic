# start-all.ps1
# Script to launch all AuraAgentic services concurrently in separate PowerShell windows.
# Run this from the root directory of the project.

$rootDir = $PSScriptRoot
if (-not $rootDir) {
    $rootDir = Get-Location
}
Set-Location $rootDir

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   AURA AGENTIC SYSTEM STARTUP SCRIPT   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Root Directory: $rootDir" -ForegroundColor Gray
Write-Host "Services will start in separate windows..." -ForegroundColor Gray
Write-Host ""

# Helper to generate PowerShell startup script block for each microservice
function Get-StartCommand {
    param (
        [string]$AppSubDir,
        [string]$StartCmd,
        [hashtable]$ExtraEnv = @{}
    )

    $envBlock = ""
    
    # 1. Load variables from .env file if it exists in the subdirectory
    $envPath = Join-Path $rootDir "$AppSubDir\.env"
    if (Test-Path $envPath) {
        $envBlock += @"
# Load environment variables from .env
Get-Content "$envPath" | ForEach-Object {
    if (`$_ -match '^([^#\s][^=]*)=(.*)`$') {
        `$key = `$Matches[1].Trim()
        `$val = `$Matches[2].Trim()
        # Remove surrounding quotes if they exist
        if (`$val -match '^"(.*)"`$' -or `$val -match "^'(.*)'`$") {
            `$val = `$Matches[1]
        }
        `$env:`$key = `$val
    }
}
"@
    }

    # 2. Add extra environment variables passed via parameter (e.g. BRAIN_MODE)
    foreach ($key in $ExtraEnv.Keys) {
        $val = $ExtraEnv[$key]
        $envBlock += "`n`$env:$key = '$val'"
    }

    # 3. Check and activate Python virtual environment if it exists
    $pythonVenvBlock = @"
if (Test-Path "venv\Scripts\Activate.ps1") {
    . venv\Scripts\Activate.ps1
    Write-Host "Activated virtual environment (venv)" -ForegroundColor Yellow
} elseif (Test-Path ".venv\Scripts\Activate.ps1") {
    . .venv\Scripts\Activate.ps1
    Write-Host "Activated virtual environment (.venv)" -ForegroundColor Yellow
}
"@

    # Combine all parts
    $fullScript = @"
cd "$rootDir\$AppSubDir"
$envBlock
$pythonVenvBlock
Write-Host "--------------------------------------------------" -ForegroundColor DarkGray
Write-Host "Starting Service in $AppSubDir" -ForegroundColor Cyan
Write-Host "Command: $StartCmd" -ForegroundColor DarkCyan
Write-Host "--------------------------------------------------" -ForegroundColor DarkGray
$StartCmd
"@

    return $fullScript
}

# 1. Hermes Tool Executor (FastAPI - Port 5000)
Write-Host "[1/6] Launching Hermes (Tool Executor on port 5000)..." -ForegroundColor Green
$hermesScript = Get-StartCommand -AppSubDir "apps\aura-hermes" -StartCmd "uvicorn main:app --host 0.0.0.0 --port 5000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $hermesScript -WindowStyle Normal

# 2. Research Crew (FastAPI/CrewAI - Port 8003)
Write-Host "[2/6] Launching Research Crew (on port 8003)..." -ForegroundColor Green
$researchScript = Get-StartCommand -AppSubDir "apps\aura-crewai" -StartCmd "uvicorn crews.research_crew.main:app --host 0.0.0.0 --port 8003"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $researchScript -WindowStyle Normal

# 3. Image Crew (FastAPI/CrewAI - Port 8004)
Write-Host "[3/6] Launching Image Crew (on port 8004)..." -ForegroundColor Green
$imageScript = Get-StartCommand -AppSubDir "apps\aura-crewai" -StartCmd "uvicorn crews.image_crew.main:app --host 0.0.0.0 --port 8004"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $imageScript -WindowStyle Normal

# 4. Brain - Router Mode (NodeJS - Port 3001)
Write-Host "[4/6] Launching Brain Router (on port 3001)..." -ForegroundColor Green
$routerScript = Get-StartCommand -AppSubDir "apps\aura-brain" -StartCmd "node server.js" -ExtraEnv @{ "BRAIN_MODE" = "router"; "PORT" = "3001" }
Start-Process powershell -ArgumentList "-NoExit", "-Command", $routerScript -WindowStyle Normal

# 5. Brain - Worker Mode (NodeJS - Port 3002)
Write-Host "[5/6] Launching Brain Worker (on port 3002)..." -ForegroundColor Green
$workerScript = Get-StartCommand -AppSubDir "apps\aura-brain" -StartCmd "node server.js" -ExtraEnv @{ "BRAIN_MODE" = "worker"; "PORT" = "3002" }
Start-Process powershell -ArgumentList "-NoExit", "-Command", $workerScript -WindowStyle Normal

# 6. Gateway Service (NodeJS - Port 3000)
Write-Host "[6/6] Launching Gateway (on port 3000)..." -ForegroundColor Green
$gatewayScript = Get-StartCommand -AppSubDir "apps\gateway" -StartCmd "node server.js" -ExtraEnv @{ "PORT" = "3000" }
Start-Process powershell -ArgumentList "-NoExit", "-Command", $gatewayScript -WindowStyle Normal

Write-Host ""
Write-Host "=========================================" -ForegroundColor Yellow
Write-Host "SUCCESS: All 6 services started!" -ForegroundColor Yellow
Write-Host "Please check the individual PowerShell windows for logs." -ForegroundColor Gray
Write-Host "=========================================" -ForegroundColor Yellow
