param(
  [Parameter(Mandatory = $true)]
  [string]$ServicePath
)

. (Join-Path $PSScriptRoot "shared.ps1")

$root = Get-RootPath
$bun = Get-BunPath

Import-DotEnv -RootPath $root
Normalize-ProcessEnvironment

$serviceDirectory = Join-Path $root $ServicePath
if (-not (Test-Path $serviceDirectory)) {
  throw "No existe el directorio del servicio: $ServicePath"
}

Push-Location $serviceDirectory
try {
  & $bun run dev
} finally {
  Pop-Location
}
