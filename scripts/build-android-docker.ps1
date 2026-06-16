param(
  [ValidateSet('Debug', 'Release')]
  [string] $BuildType = 'Debug',
  [string] $ImageName = 'phaserincremental-android-builder',
  [switch] $SkipImageBuild
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
$gradleCache = 'phaserincremental-gradle-cache'
$nodeModulesCache = 'phaserincremental-node-modules'
$gradleTask = "assemble$BuildType"

function Invoke-NativeChecked {
  & $args[0] @($args | Select-Object -Skip 1)
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $($args -join ' ')"
  }
}

Push-Location $repoRoot
try {
  if (-not $SkipImageBuild) {
    Invoke-NativeChecked docker build -t $ImageName .
  }

  Invoke-NativeChecked docker volume create $gradleCache | Out-Null
  Invoke-NativeChecked docker volume create $nodeModulesCache | Out-Null

  Invoke-NativeChecked docker run --rm `
    -v "${repoRoot}:/app" `
    -v "${gradleCache}:/root/.gradle" `
    -v "${nodeModulesCache}:/app/node_modules" `
    -w /app `
    $ImageName `
    bash -lc "npm ci && npm run build && npx cap sync android && cd android && bash ./gradlew $gradleTask"
}
finally {
  Pop-Location
}
