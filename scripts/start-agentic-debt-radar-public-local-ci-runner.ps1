[CmdletBinding()]
param(
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RunnerServiceEnabled = $false
$CandidatePath = Join-Path $PSScriptRoot "..\deploy\local-ci-host\runner-candidate.v1.json"

function Read-RunnerCandidate {
  $source = Get-Content -Raw -LiteralPath $CandidatePath
  try {
    return $source | ConvertFrom-Json
  } catch {
    throw "The fixed local CI runner candidate is not valid JSON."
  }
}

if (-not $DryRun) {
  throw "The Agentic Debt Radar public local CI runner wrapper is hard-disabled. It cannot download, register, install, start, or remove a runner."
}

$candidate = Read-RunnerCandidate
if (
  $RunnerServiceEnabled -ne $false -or
  $candidate.state -ne "inactive_owner_gated_not_registered" -or
  $candidate.guards.wrapperHardDisabled -ne $true -or
  $candidate.guards.runnerRegistrationAllowed -ne $false -or
  $candidate.guards.serviceStartAllowed -ne $false -or
  $candidate.credentials.registration.mayBePersisted -ne $false
) {
  throw "The fixed local CI runner candidate does not remain hard-disabled."
}

[PSCustomObject]@{
  state = $candidate.state
  dryRun = $true
  networkAttempted = $false
  runnerRegistrationAttempted = $false
  serviceStartAttempted = $false
  runnerName = $candidate.runner.name
  serviceName = $candidate.runner.serviceName
  runnerRoot = $candidate.runner.runnerRoot
  workRoot = $candidate.runner.workRoot
  labels = @($candidate.runner.labels)
  workflowSource = $candidate.workflow.inactiveSourcePath
  activeWorkflowCreated = $false
  containsCredentials = $false
} | ConvertTo-Json -Compress
