# Agentic Debt Radar public local CI host runbook

Status: **candidate only — inactive, unregistered, and hard-disabled.**

This runbook applies only to `shengyun50452/agentic-debt-radar`. It must never
be applied to Market-Lab or another repository. The candidate fixes a distinct
Windows runner name (`agentic-debt-radar-public-local-ci-windows-01`), service
name (`agentic-debt-radar-public-local-ci-runner`), runner root
(`C:\agentic-debt-radar-public-local-ci-runner`), work root
(`C:\agentic-debt-radar-public-local-ci-work`), and custom label
(`agentic-debt-radar-public-local-ci`). Do not reuse, rename, or point these at
another project's runner, service, directory, label, configuration, or
credential.

The versioned candidate is `deploy/local-ci-host/runner-candidate.v1.json`.
The workflow source is deliberately inactive at
`.github/workflow-candidates/local-ci-host.v1.yml`, not under
`.github/workflows`. `scripts/start-agentic-debt-radar-public-local-ci-runner.ps1`
is hard-disabled and has no registration, download, service, network, or
removal path. Its `-DryRun` is informational only.

## Preconditions before activation

An owner must complete every gate below before moving a reviewed copy of the
workflow source to `.github/workflows/local-ci-host.yml` or registering a
runner.

1. Confirm GitHub owner authentication and MFA in the owner-controlled session.
   Obtain a new ephemeral repository runner-registration token only at the
   moment of manual registration. Never put it in a file, command history,
   issue, workflow, artifact, repository, or chat transcript; revoke it if the
   registration does not complete immediately.
2. Obtain the runner binary only from GitHub's official release route. Record
   the release version and independently verify the official artifact's
   SHA-256 before extraction. Keep that reviewed checksum and artifact evidence
   outside this public repository; the candidate intentionally records no
   unverified artifact hash.
3. Verify the candidate's exact dedicated service name, runner root, work root,
   and label. Confirm the paths do not already belong to another project and
   ensure filesystem permissions allow only the owner and the dedicated service
   identity. Do not share a runner account, service identity, registration
   token, working directory, or cache with Market-Lab.
4. Reverify the public MVP's frozen test command in
   `ci/repository-ci-command.v1.json`: `npm.cmd test -- --test-concurrency=1`.
   It must remain documented in the `README.md` Local CI readiness section and
   pass offline review. The
   workflow must continue to call `scripts/invoke-repository-ci.ps1`, rather
   than inferring another command.
5. Verify the official `actions/checkout` commit SHA already pinned in the
   candidate workflow, its `github.token` use, `contents: read`,
   `persist-credentials: false`, `fetch-depth: 1`, and exact `github.sha`
   checkout. Do not add a third-party action, a mutable action tag, a personal
   access token, a repository secret, or write permission.
6. Confirm the only triggers are a push to this repository's `main` branch and
   a manual run on this repository's `main` branch. `pull_request`,
   `pull_request_target`, fork execution, workflow chaining, and issue-comment
   execution remain forbidden. The job must verify that checked-out `HEAD`
   equals `GITHUB_SHA` before executing the frozen command.
7. Run the offline check and contract test, commit the candidate and its active
   workflow move as one reviewed change, and use the GitHub UI to verify the
   resulting workflow's event and permission summary before registering the
   service. Candidate preparation itself grants no registration or execution
   authority.

## Manual registration and operation

Only after all gates pass, register through the owner-controlled GitHub flow
with the freshly generated ephemeral token. Use the exact candidate runner
name, label, runner root, and work root. Verify the GitHub UI shows a
repository-scoped runner with no unexpected labels. Install and start only the
dedicated Windows service after this UI verification. Do not make installation
or service start automatic.

After one trusted `main` push or manual `main` dispatch, inspect the job before
relying on it: it must have used the dedicated label, the exact event SHA, an
ephemeral GitHub workflow token with only `contents: read`, and the frozen
repository command. A runner registration, workflow execution, or CI result is
not market evidence or a market signal.

## Removal and incident response

On a security concern, unexpected label/job, permission drift, fork/PR event,
token exposure, or uncertainty: disable the active workflow, stop the exact
dedicated service, and remove the repository runner through the GitHub owner
UI. Revoke any still-valid registration token. Only after verifying the exact
dedicated paths may the owner remove the named runner root and work root; do
not delete a shared or computed directory. Preserve the minimum non-secret
incident evidence needed for owner review, but never retain a token or runner
credential.
