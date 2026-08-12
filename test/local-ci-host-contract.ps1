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

& $invoker -RepositoryRoot $repositoryRoot
if ($LASTEXITCODE -ne 0) {
  throw "The frozen public MVP test command failed."
}

Write-Output "local-ci-host contract: ok (candidate inactive; frozen MVP tests pass)"
