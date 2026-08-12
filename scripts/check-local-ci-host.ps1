[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$candidatePath = Join-Path $repositoryRoot "deploy\local-ci-host\runner-candidate.v1.json"
$workflowSourcePath = Join-Path $repositoryRoot ".github\workflow-candidates\local-ci-host.v1.yml"
$activeWorkflowPath = Join-Path $repositoryRoot ".github\workflows\local-ci-host.yml"
$wrapperPath = Join-Path $repositoryRoot "scripts\start-agentic-debt-radar-public-local-ci-runner.ps1"
$invokerPath = Join-Path $repositoryRoot "scripts\invoke-repository-ci.ps1"
$manifestPath = Join-Path $repositoryRoot "ci\repository-ci-command.v1.json"

try {
  $candidate = (Get-Content -Raw -LiteralPath $candidatePath) | ConvertFrom-Json
  $manifest = (Get-Content -Raw -LiteralPath $manifestPath) | ConvertFrom-Json
} catch {
  throw "The local CI host candidate or its command manifest is not valid JSON."
}

if (
  $candidate.schemaVersion -ne 1 -or
  $candidate.id -ne "agentic-debt-radar-public-local-ci-host-v1" -or
  $candidate.state -ne "inactive_owner_gated_not_registered" -or
  $candidate.repository.slug -ne "shengyun50452/agentic-debt-radar" -or
  $candidate.repository.defaultBranch -ne "main" -or
  $candidate.repository.forkOrPullRequestExecutionAllowed -ne $false -or
  $candidate.runner.name -ne "agentic-debt-radar-public-local-ci-windows-01" -or
  $candidate.runner.serviceName -ne "agentic-debt-radar-public-local-ci-runner" -or
  $candidate.runner.runnerRoot -ne "C:\agentic-debt-radar-public-local-ci-runner" -or
  $candidate.runner.workRoot -ne "C:\agentic-debt-radar-public-local-ci-work" -or
  $candidate.runner.sharedWithMarketLab -ne $false -or
  $candidate.runner.sharedWithAnyOtherProject -ne $false -or
  (@($candidate.runner.labels) -join ",") -ne "self-hosted,windows,x64,agentic-debt-radar-public-local-ci" -or
  $candidate.workflow.inactiveSourcePath -ne ".github/workflow-candidates/local-ci-host.v1.yml" -or
  $candidate.workflow.futureActivePath -ne ".github/workflows/local-ci-host.yml" -or
  $candidate.workflow.activeAtCandidateTime -ne $false -or
  $candidate.workflow.permissions.contents -ne "read" -or
  $candidate.workflow.officialAction.name -ne "actions/checkout" -or
  $candidate.workflow.officialAction.sha -notmatch '^[0-9a-f]{40}$' -or
  $candidate.workflow.officialAction.persistCredentials -ne $false -or
  $candidate.workflow.thirdPartyActionsAllowed -ne $false -or
  $candidate.credentials.registration.mayBePersisted -ne $false -or
  $candidate.credentials.registration.requiresOwnerMfa -ne $true -or
  $candidate.credentials.workflow.additionalSecretsAllowed -ne $false -or
  $candidate.runnerArtifact.artifactSha256 -ne $null -or
  $candidate.mvpCheck.state -ne "blocked_pending_mvp_documented_test_command_freeze" -or
  $candidate.mvpCheck.workflowActivationAllowed -ne $false -or
  $candidate.guards.wrapperHardDisabled -ne $true -or
  $candidate.guards.runnerRegistrationAllowed -ne $false -or
  $candidate.guards.serviceStartAllowed -ne $false -or
  $candidate.guards.networkAllowedByWrapper -ne $false -or
  $candidate.guards.zeroThirdPartyDependencies -ne $true -or
  $candidate.containsCredentials -ne $false -or
  $candidate.countsAsMarketSignal -ne $false
) {
  throw "The local CI runner candidate does not retain its repository-only owner gates."
}

if (
  $manifest.state -ne "blocked_pending_mvp_documented_test_command_freeze" -or
  $manifest.command -ne $null -or
  $manifest.commandMayBeInferred -ne $false -or
  $manifest.thirdPartyDependenciesAllowed -ne $false
) {
  throw "The MVP CI command must remain explicitly blocked until its documented test command is frozen."
}

if (Test-Path -LiteralPath $activeWorkflowPath) {
  throw "The local CI workflow must remain inactive outside .github/workflows."
}

$workflow = Get-Content -Raw -LiteralPath $workflowSourcePath
$wrapper = Get-Content -Raw -LiteralPath $wrapperPath
$invoker = Get-Content -Raw -LiteralPath $invokerPath
if (
  $workflow -match '(?im)^\s*pull_request(?:_target)?\s*:' -or
  $workflow -match '(?im)^\s*workflow_run\s*:' -or
  $workflow -notmatch '(?m)^\s*contents:\s*read\s*$' -or
  $workflow -notmatch 'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683' -or
  $workflow -notmatch 'persist-credentials:\s*false' -or
  $workflow -notmatch 'ref:\s*\$\{\{ github\.sha \}\}' -or
  $workflow -notmatch 'token:\s*\$\{\{ github\.token \}\}' -or
  $workflow -notmatch 'github\.ref == ''refs/heads/main''' -or
  $workflow -notmatch 'git rev-parse HEAD' -or
  $workflow -notmatch 'invoke-repository-ci\.ps1' -or
  $wrapper -notmatch '\$RunnerServiceEnabled = \$false' -or
  $wrapper -match 'Start-Process|Invoke-WebRequest|config\.cmd|svc\.cmd|Remove-Item' -or
  $invoker -match 'Invoke-Expression'
) {
  throw "The inactive local CI workflow or wrapper does not retain its fixed safety boundary."
}

Write-Output "local-ci-host check: ok (inactive, repository-only, hard-disabled, no runner registration)"
