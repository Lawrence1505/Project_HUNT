# HEAL — one-click local start.
# Right-click this file -> "Run with PowerShell", or run:  powershell -File start.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n=== Starting HEAL ===" -ForegroundColor Cyan

# 1. Make sure Docker is running (start Docker Desktop if needed)
Write-Host "[1/4] Checking Docker..." -ForegroundColor Yellow
$dockerUp = $false
try { docker version --format '{{.Server.Version}}' *> $null; $dockerUp = $? } catch { $dockerUp = $false }
if (-not $dockerUp) {
  Write-Host "      Docker not running - launching Docker Desktop..."
  $dd = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
  if (Test-Path $dd) { Start-Process $dd }
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 2
    try { docker version --format '{{.Server.Version}}' *> $null; if ($?) { $dockerUp = $true; break } } catch {}
  }
}
if (-not $dockerUp) { Write-Host "      Could not start Docker. Open Docker Desktop manually, then re-run." -ForegroundColor Red; exit 1 }

# 2. Start the Postgres container and wait until healthy
Write-Host "[2/4] Starting database (heal-postgres)..." -ForegroundColor Yellow
docker start heal-postgres *> $null
for ($i = 0; $i -lt 30; $i++) {
  $h = docker inspect --format '{{.State.Health.Status}}' heal-postgres 2>$null
  if ($h -eq "healthy") { break }
  Start-Sleep -Seconds 1
}
Write-Host "      Database: healthy" -ForegroundColor Green

# 3. Start the API server in its own window
Write-Host "[3/4] Starting API server (http://localhost:4000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\server'; npm start"

# 4. Start the web app in its own window
Write-Host "[4/4] Starting web app (http://localhost:5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run dev"

# Give them a moment, then open the browser
Start-Sleep -Seconds 5
Start-Process "http://localhost:5173"

Write-Host "`n=== HEAL is starting ===" -ForegroundColor Cyan
Write-Host "  Web:  http://localhost:5173" -ForegroundColor Green
Write-Host "  API:  http://localhost:4000/api/health" -ForegroundColor Green
Write-Host "  Two new windows opened (API + web). Close them to stop those services." -ForegroundColor Gray
Write-Host "  Your browser should open automatically in a few seconds.`n"
