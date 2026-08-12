<p align="center">
  <img src="assets/agentic-debt-radar-mark.svg" width="112" height="112" alt="Agentic Debt Radar instrument mark">
</p>

# Agentic Debt Radar

> Observable public-tree signals before agent speed becomes maintenance debt.

Agentic Debt Radar is an early-stage repository-readiness MVP operated by **Sheng-Yun, an individual operator**. It is not a company, consultancy, security audit, code-quality verdict, or AI-authorship detector.

The MVP answers one deliberately narrow question for technical founders and engineering leads at small teams using coding agents weekly: does a supplied *public repository tree snapshot* expose enough structure to start a bounded conversation about the next agent-assisted change?

It reports five limited dimensions:

1. agent context;
2. verification loop;
3. change containment;
4. recovery path; and
5. human review boundary.

Each observation links to visible paths, names a counterexample, and carries a limitation. A visible file never proves that a process works; a missing file is a review prompt, not a negative finding.

**Fastest path:** [run the free public-repository probe](https://agentic-debt-radar.romispshop.workers.dev/?source=github_probe_repo). It accepts an exact public GitHub repository root URL and returns the same bounded evidence class without requiring an account or email. You can also [inspect the static synthetic report](https://agentic-debt-radar.romispshop.workers.dev/example) before scanning anything.

The local CLI below is the inspectable, deterministic MVP path. It is useful when you want to review the input and output contract without sending a repository URL to the live probe.

## First run: a complete safe example

Requirements: Node.js 22+; no package install is required. The command executes only this repository's small analyzer. It does not clone, build, import, or execute code from the synthetic example repository—or any target repository. It makes no network request.

```bash
git clone https://github.com/shengyun50452/agentic-debt-radar.git
cd agentic-debt-radar
npm run example
```

The input is the disclosed, code-free [synthetic public-tree snapshot](fixtures/synthetic-public-tree.v1.json). The deterministic output is checked in as the [example report](examples/synthetic-public-tree.report.v1.json). It shows the exact evidence mapping, five observations, and three prioritized next checks before anyone supplies a real repository snapshot.

To run the same bounded analyzer against another locally prepared public snapshot:

```bash
node bin/agentic-debt-radar.js analyze path/to/public-tree-snapshot.json
```

The snapshot format is versioned in the [MVP contract](contract/agentic-debt-radar-mvp.v1.json). It accepts only public GitHub URL metadata, a default branch name, visible normalized paths, reported byte sizes, and a disclosure that the JSON includes no repository code. The CLI never accepts a repository URL as a fetch target, credentials, a clone command, or an execution flag.

Every report marks the snapshot as `locally_supplied_unverified_no_remote_verification`. The repository URL, default branch, and tree completeness are supplied claims; this offline MVP does not fetch or verify them.

## What it can and cannot show

The analyzer maps path names and reported sizes to five questions. For example, a visible `AGENTS.md` is a **visible signal** for agent context; it does not prove the instructions are correct, current, or followed. A visible test or workflow path is likewise not proof that tests pass. The report makes those counterexamples explicit.

It never:

- clones, executes, builds, or imports a submitted repository;
- reads target repository file contents;
- accepts credentials or makes network requests;
- assesses developer performance, detects AI-written code, or performs a security audit; or
- turns a more complete tree, a generated report, or a new feature into market evidence.

Use only snapshots of repositories you are allowed to inspect. Do not include private paths, source code, credentials, personal data, or undisclosed vulnerabilities. See [SECURITY.md](SECURITY.md) for reporting boundaries.

## Method, limitations, and counterexamples

The full versioned method—including the five dimensions, required counterexamples, synthetic-fixture disclosure, and safety boundary—is in [the MVP contract](contract/agentic-debt-radar-mvp.v1.json).

The main limitations are intentional:

- paths and sizes are structure-level evidence, not proof of an operating practice;
- an absent path may be a naming difference, generated file, snapshot limit, or unobserved process;
- the synthetic report is illustrative and establishes no customer problem, demand, experienced value, or willingness to pay; and
- the report cannot determine whether an agent-driven change will succeed or fail.

If a tree-level inference is misleading, open a **Tree-evidence counterexample** issue with only publicly available detail. A useful counterexample states the visible path, the inference challenged, and why the path-level interpretation fails. It should never include private repository information or a vulnerability.

## What this MVP is trying to learn

The first purpose is to reduce avoidable loss at the nearest evidenced layer: **trust**, **message understanding**, or **experienced value**. This repository deliberately records no completed public report, counterexample, pilot-fit application, or paid-intent event, so it makes no claim that those losses exist or that the MVP reduces them.

Observable events and their limits are versioned in the contract:

- inspecting or generating the synthetic example is not a commercial signal;
- a public-tree counterexample can challenge method clarity, not prove buyer demand;
- a completed report for a visitor-selected public repository can test message understanding, not experienced value or willingness to pay;
- an optional pilot-fit application is not payment, a contract, or verified demand; and
- only a consented, independently reviewed concrete paid next step can support a paid-intent conclusion.

When evidence contradicts the MVP, change only the nearest supported hypothesis layer—trust/message understanding, experienced value, problem strength, paid intent, or real next step. Do not add features, equate completeness with success, or use publication or attention as a substitute for evidence.

## Optional pilot CTA

If the public report makes a real maintenance/review problem clearer, evaluate the proposed pilot scope: one private repository, read-only tree and metadata, a weekly change summary, evidence-linked drift alerts, and one prioritized remediation review. The **expected** ongoing price is **USD 149 per repository per month**.

That is an expectation to test, not an offer, active service, payment request, contract, guarantee, or claim of proven demand. It never authorizes private access or credentials through this repository. The current public probe and optional fit path are linked from the [live public surface](https://agentic-debt-radar.romispshop.workers.dev/?source=github_probe_repo); only proceed if its displayed scope and privacy boundary are appropriate.

## Local verification

This MVP has zero third-party dependencies. It includes local tests and a contract/example consistency check, but this README makes no claim that any hosted CI is enabled.

```bash
npm test
npm run check
```

Security or privacy concerns should be reported privately to **romispshop@gmail.com**, not through a public issue. The [public privacy notice](https://agentic-debt-radar.romispshop.workers.dev/privacy) explains the data boundary and 30-day retention period.

## Local CI readiness

The repository includes an **inactive**, owner-gated Windows self-hosted runner
candidate at `deploy/local-ci-host/runner-candidate.v1.json`. It is dedicated
only to `shengyun50452/agentic-debt-radar`: its proposed runner name, Windows
service, runner root, work root, and label are not shared with Market-Lab or any
other project. The candidate workflow is deliberately outside the active
GitHub Actions directory at `.github/workflow-candidates/local-ci-host.v1.yml`.
It accepts only trusted `main` pushes and manual runs on `main`; it contains no
pull-request trigger and no third-party action.

The candidate remains unregistered and its wrapper is hard-disabled. It cannot
download, register, install, start, remove, or contact a runner service. Owner
registration/MFA, official runner artifact and SHA-256 verification, a frozen
repository test command, workflow activation, and later removal remain manual
gates described in [`docs/local-ci-host-runbook.md`](docs/local-ci-host-runbook.md).
No token, runner registration credential, or service credential belongs in this
repository.

The future workflow uses only the repository's own frozen documented-check
manifest, `ci/repository-ci-command.v1.json`; that manifest is intentionally
blocked until the public MVP defines its test command. It will not infer or
invent a command for files that do not yet exist.

Offline candidate checks require only Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-local-ci-host.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File test/local-ci-host-contract.ps1
```
