Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$check = Join-Path $repositoryRoot "scripts\check-local-ci-host.ps1"
$wrapper = Join-Path $repositoryRoot "scripts\start-agentic-debt-radar-public-local-ci-runner.ps1"
$invoker = Join-Path $repositoryRoot "scripts\invoke-repository-ci.ps1"

& $check

$dryRun = (& $wrapper -DryRun | ConvertFrom-Json)
if (
  $dryRun.dryRun -ne $true -or
  $dryRun.networkAttempted -ne $false -or
  $dryRun.runnerRegistrationAttempted -ne $false -or
  $dryRun.serviceStartAttempted -ne $false -or
  $dryRun.activeWorkflowCreated -ne $false -or
  $dryRun.containsCredentials -ne $false
) {
  throw "The hard-disabled local CI wrapper does not remain inert."
}

try {
  & $invoker -RepositoryRoot $repositoryRoot
  throw "The blocked MVP command unexpectedly ran."
} catch {
  if ($_.Exception.Message -notmatch "blocked until the MVP freezes") {
    throw
  }
}

Write-Output "local-ci-host contract: ok (candidate remains inactive until MVP command freeze)"
