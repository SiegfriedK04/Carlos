function Get-BunPath {
  $bunCommand = Get-Command bun -ErrorAction SilentlyContinue
  if ($bunCommand) {
    return $bunCommand.Source
  }

  $fallback = Join-Path $env:USERPROFILE ".bun\bin\bun.exe"
  if (Test-Path $fallback) {
    return $fallback
  }

  throw "No se encontro bun.exe. Instala Bun o agregalo al PATH."
}

function Import-DotEnv {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RootPath
  )

  $envPath = Join-Path $RootPath ".env"
  if (-not (Test-Path $envPath)) {
    throw "No existe el archivo .env en $RootPath."
  }

  Get-Content $envPath | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
  }
}

function Normalize-ProcessEnvironment {
  $effectivePath = $env:Path

  Remove-Item Env:PATH -ErrorAction SilentlyContinue
  [Environment]::SetEnvironmentVariable("PATH", $null, "Process")

  if ($effectivePath) {
    $env:Path = $effectivePath
    [Environment]::SetEnvironmentVariable("Path", $effectivePath, "Process")
  }
}

function Get-RootPath {
  return Split-Path -Parent $PSScriptRoot
}
