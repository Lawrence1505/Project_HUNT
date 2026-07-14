# HEAL — stop the local services.
# Right-click -> "Run with PowerShell", or:  powershell -File stop.ps1
Write-Host "`n=== Stopping HEAL ===" -ForegroundColor Cyan

# Stop the API (:4000) and web (:5173/:5174) node processes
foreach ($port in 4000, 5173, 5174) {
  $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $pids) {
    $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($p -and $p.ProcessName -eq "node") {
      Stop-Process -Id $procId -Force -Confirm:$false
      Write-Host "  stopped node on port $port" -ForegroundColor Green
    }
  }
}

# Stop the database container (data is preserved on disk)
docker stop heal-postgres *> $null
if ($?) { Write-Host "  stopped database (data preserved)" -ForegroundColor Green }

Write-Host "=== HEAL stopped ===`n" -ForegroundColor Cyan
