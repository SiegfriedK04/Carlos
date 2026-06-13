. (Join-Path $PSScriptRoot "shared.ps1")

$root = Get-RootPath
$bun = Get-BunPath
$runScript = Join-Path $root "scripts\run-service.ps1"

Import-DotEnv -RootPath $root
Normalize-ProcessEnvironment

Push-Location (Join-Path $root "packages/shared-types")
try {
  & $bun run build
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} finally {
  Pop-Location
}

$services = @(
  @{ name = "web"; path = "apps/web"; url = "http://localhost:3000" },
  @{ name = "api"; path = "services/api"; url = "http://localhost:3001/health" },
  @{ name = "ai"; path = "services/ai"; url = "http://localhost:3002/health" }
)

$jobs = @()
foreach ($service in $services) {
  $jobs += Start-Job -Name $service.name -ScriptBlock {
    param($scriptPath, $servicePath)
    & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath $servicePath
  } -ArgumentList $runScript, $service.path
}

Write-Host "Servicios lanzados desde una sola orden:"
foreach ($service in $services) {
  Write-Host "- $($service.name): $($service.url)"
}
Write-Host "Mantén esta terminal abierta. Para detener todo, usa Ctrl+C."

try {
  while ($true) {
    foreach ($job in $jobs) {
      Receive-Job -Job $job -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "[$($job.Name)] $_"
      }
    }

    $failed = $jobs | Where-Object { $_.State -in @("Failed", "Stopped", "Completed") }
    if ($failed) {
      foreach ($job in $failed) {
        Write-Host "[$($job.Name)] El servicio terminó con estado $($job.State)."
      }
      break
    }

    Start-Sleep -Milliseconds 750
  }
} finally {
  foreach ($job in $jobs) {
    Stop-Job -Job $job -ErrorAction SilentlyContinue
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
  }
}
