. (Join-Path $PSScriptRoot "shared.ps1")

$root = Get-RootPath
$bun = Get-BunPath
Import-DotEnv -RootPath $root
Normalize-ProcessEnvironment

$targets = @(
  "packages/shared-types",
  "apps/web",
  "services/api",
  "services/ai"
)

foreach ($target in $targets) {
  Push-Location (Join-Path $root $target)
  try {
    $scriptName = if ($target -eq "packages/shared-types") { "build" } else { "check" }
    & $bun run $scriptName
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  } finally {
    Pop-Location
  }
}
