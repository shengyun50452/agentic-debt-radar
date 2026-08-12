Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$check = Join-Path $repositoryRoot "scripts\check-local-ci-host.ps1"
$wrapper = Join-Path $repositoryRoot "scripts\start-agentic-debt-radar-public-local-ci-runner.ps1"
$invoker = Join-Path $repositoryRoot "scripts\invoke-repository-ci.ps1"

& $check

$git = @(Get-Command git -CommandType Application -ErrorAction Stop)[0]
$lfLockedPaths = @(
  ".github/workflow-candidates/local-ci-host.v1.yml",
  "scripts/start-agentic-debt-radar-public-local-ci-runner.ps1",
  "ci/repository-ci-command.v1.json",
  "deploy/local-ci-host/runner-candidate.v1.json",
  "scripts/check-local-ci-host.ps1",
  "scripts/invoke-repository-ci.ps1",
  "test/local-ci-host-contract.ps1"
)
& $git.Source ls-files --error-unmatch -- .gitattributes
if ($LASTEXITCODE -ne 0) {
  throw "The LF policy for hash-bound local CI evidence must be tracked."
}
foreach ($relativePath in $lfLockedPaths) {
  $attribute = (& $git.Source check-attr eol -- $relativePath).Trim()
  if ($LASTEXITCODE -ne 0 -or $attribute -cne ("{0}: eol: lf" -f $relativePath)) {
    throw "The hash-bound local CI path $relativePath must be locked to LF."
  }
}

$contractFiles = @(
  "deploy\local-ci-host\runner-candidate.v1.json",
  ".github\workflow-candidates\local-ci-host.v1.yml",
  "ci\repository-ci-command.v1.json",
  "scripts\start-agentic-debt-radar-public-local-ci-runner.ps1",
  "scripts\invoke-repository-ci.ps1"
)
foreach ($driftPath in @(
  ".github\workflow-candidates\local-ci-host.v1.yml",
  "scripts\start-agentic-debt-radar-public-local-ci-runner.ps1",
  "ci\repository-ci-command.v1.json"
)) {
  $fixtureRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("agentic-debt-radar-local-ci-host-" + [System.Guid]::NewGuid().ToString("N"))
  try {
    foreach ($relativePath in $contractFiles) {
      $sourcePath = Join-Path $repositoryRoot $relativePath
      $destinationPath = Join-Path $fixtureRoot $relativePath
      New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destinationPath) | Out-Null
      Copy-Item -LiteralPath $sourcePath -Destination $destinationPath
    }

    Add-Content -LiteralPath (Join-Path $fixtureRoot $driftPath) -Value ""
    $hashDriftRejected = $false
    try {
      & $check -RepositoryRoot $fixtureRoot
    } catch {
      if ($_.Exception.Message -match "hash-bound inactive local CI candidate") {
        $hashDriftRejected = $true
      } else {
        throw
      }
    }
    if (-not $hashDriftRejected) {
      throw "The local CI contract accepted $driftPath even though its candidate SHA-256 did not match."
    }
  } finally {
    if (Test-Path -LiteralPath $fixtureRoot) {
      Remove-Item -LiteralPath $fixtureRoot -Recurse -Force
    }
  }
}

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
