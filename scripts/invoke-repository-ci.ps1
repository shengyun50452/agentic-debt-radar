[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$RepositoryRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$resolvedRoot = (Resolve-Path -LiteralPath $RepositoryRoot).Path
$manifestPath = Join-Path $resolvedRoot "ci\repository-ci-command.v1.json"
$readmePath = Join-Path $resolvedRoot "README.md"

try {
  $manifest = (Get-Content -Raw -LiteralPath $manifestPath) | ConvertFrom-Json
} catch {
  throw "The repository CI command manifest is not valid JSON."
}

if (
  $manifest.schemaVersion -ne 1 -or
  $manifest.id -ne "agentic-debt-radar-public-repository-ci-command-v1" -or
  $manifest.documentationPath -ne "README.md" -or
  $manifest.documentationHeading -ne "Local CI readiness" -or
  $manifest.commandMayBeInferred -ne $false -or
  $manifest.thirdPartyDependenciesAllowed -ne $false
) {
  throw "The repository CI command manifest is not an approved fixed contract."
}

if ($manifest.state -eq "blocked_pending_mvp_documented_test_command_freeze") {
  throw "Repository CI remains blocked until the MVP freezes a documented test command."
}

if (
  $manifest.state -ne "frozen_documented_test_command" -or
  $null -eq $manifest.command -or
  $manifest.command.executable -notmatch '^[A-Za-z0-9_.-]+$' -or
  $manifest.command.arguments -isnot [System.Collections.IEnumerable] -or
  -not (Test-Path -LiteralPath $readmePath)
) {
  throw "The repository CI command is not frozen, bounded, and documented."
}

$readme = Get-Content -Raw -LiteralPath $readmePath
if ($readme -notmatch "(?m)^## Local CI readiness$") {
  throw "The repository CI command is not documented in README.md."
}

$arguments = @($manifest.command.arguments)
if ($arguments | Where-Object { $_ -isnot [string] -or $_.Length -gt 256 }) {
  throw "The repository CI command arguments are invalid."
}

& $manifest.command.executable @arguments
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
