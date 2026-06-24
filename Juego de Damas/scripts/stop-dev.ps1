. (Join-Path $PSScriptRoot "shared.ps1")

$root = Get-RootPath
$stateFile = Join-Path $root ".logs\dev-processes.json"

if (-not (Test-Path $stateFile)) {
  Write-Host "No hay procesos registrados para detener."
  exit 0
}

$entries = Get-Content $stateFile | ConvertFrom-Json
foreach ($entry in $entries) {
  if (-not $entry.pid) {
    continue
  }
  $process = Get-Process -Id $entry.pid -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $entry.pid -Force
    Write-Host "Detenido $($entry.name) (PID $($entry.pid))."
  }
}

Remove-Item -LiteralPath $stateFile -Force
