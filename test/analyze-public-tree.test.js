import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PublicTreeSnapshotError,
  analyzePublicTreeSnapshot,
  serializePublicTreeReport,
  validatePublicTreeSnapshot,
} from "../src/analyze-public-tree.js";

const fixtureUrl = new URL("../fixtures/synthetic-public-tree.v1.json", import.meta.url);
const exampleUrl = new URL("../examples/synthetic-public-tree.report.v1.json", import.meta.url);
const cliUrl = new URL("../bin/agentic-debt-radar.js", import.meta.url);

async function fixture() {
  return JSON.parse(await readFile(fixtureUrl, "utf8"));
}

test("synthetic public-tree fixture produces the checked-in, transparent five-dimension report", async () => {
  const report = analyzePublicTreeSnapshot(await fixture());
  assert.equal(report.dimensions.length, 5);
  assert.deepEqual(report.dimensions.map(({ id, observation }) => [id, observation]), [
    ["agent_context", "visible_signal"],
    ["verification", "visible_signal"],
    ["change_containment", "visible_signal"],
    ["recovery", "visible_signal"],
    ["human_review", "visible_signal"],
  ]);
  assert.equal(report.scope.publicTreeOnly, true);
  assert.equal(report.scope.clonedRepository, false);
  assert.equal(report.scope.executedRepositoryCode, false);
  assert.equal(report.scope.readRepositoryFileContents, false);
  assert.equal(report.scope.networkRequestMade, false);
  assert.deepEqual(report.inputDisclosure, {
    classification: "synthetic_illustration",
    customerVisibleStatement:
      "This is a synthetic illustration, not evidence about a customer repository, customer problem, or demand.",
    decisionBoundary:
      "Use it only to evaluate whether the report format and limitations are understandable; do not use it to make repository or purchase decisions.",
  });
  assert.deepEqual(report.snapshot.provenance, {
    kind: "locally_supplied_unverified_no_remote_verification",
    repositoryUrlVerified: false,
    defaultBranchVerified: false,
    treeCompletenessVerified: false,
  });
  assert.match(report.limitations.join("\n"), /not fetched or remotely verified/);
  assert.equal(report.marketEvidence.status, "not_established_by_this_report");
  assert.deepEqual(report.marketEvidence.primaryLossesAddressed, [
    "trust",
    "message_understanding",
    "experienced_value",
  ]);
  assert.equal(report.pilotExpectation.priceUsdPerRepositoryPerMonth, 149);
  assert.equal(
    serializePublicTreeReport(report),
    await readFile(exampleUrl, "utf8"),
  );
});

test("missing visible paths remain prompts for review, not negative findings", async () => {
  const input = await fixture();
  input.tree = input.tree.slice(0, 1);
  const report = analyzePublicTreeSnapshot(input);
  assert.equal(report.dimensions[1].observation, "not_visible_in_snapshot");
  assert.equal(report.prioritizedActions.length, 3);
  assert.match(report.prioritizedActions[0].reason, /review prompt/);
  assert.match(report.dimensions[1].limitation, /no file contents/);
});

test("snapshot validation rejects non-public URLs, code-bearing disclosure, path traversal, and duplicates", async () => {
  const invalidInputs = [
    { repository: { publicUrl: "https://example.com/nope", defaultBranch: "main" } },
    { disclosure: { synthetic: false, createdFor: "test", containsRepositoryCode: true } },
    { tree: [{ path: "../private.txt", bytes: 1 }] },
    { tree: [{ path: "README.md", bytes: 1 }, { path: "README.md", bytes: 2 }] },
  ];
  for (const mutation of invalidInputs) {
    const input = await fixture();
    Object.assign(input, mutation);
    assert.throws(
      () => validatePublicTreeSnapshot(input),
      (error) => error instanceof PublicTreeSnapshotError && error.code === "invalid_public_tree_snapshot",
    );
  }
});

test("snapshot provenance remains unverified even when supplied identity and paths look authoritative", async () => {
  const input = await fixture();
  input.repository = {
    publicUrl: "https://github.com/openai/not-remotely-checked",
    defaultBranch: "release/claimed",
  };
  input.tree = [
    { path: "README.md", bytes: 1 },
    { path: "readme.md", bytes: 2 },
  ];
  const report = analyzePublicTreeSnapshot(input);
  assert.equal(report.repository.publicUrl, input.repository.publicUrl);
  assert.equal(report.snapshot.provenance.repositoryUrlVerified, false);
  assert.equal(report.snapshot.provenance.defaultBranchVerified, false);
  assert.equal(report.snapshot.provenance.treeCompletenessVerified, false);
  assert.deepEqual(report.dimensions[0].evidencePaths, []);
});

test("a visitor-supplied public snapshot receives a distinct, decision-safe trust disclosure", async () => {
  const input = await fixture();
  input.disclosure = {
    synthetic: false,
    createdFor: "visitor-selected public repository tree",
    containsRepositoryCode: false,
  };
  const report = analyzePublicTreeSnapshot(input);
  assert.deepEqual(report.inputDisclosure, {
    classification: "locally_supplied_public_tree_snapshot",
    customerVisibleStatement:
      "This report reflects only a locally supplied public-tree snapshot. The repository URL, default branch, and tree completeness were not remotely verified.",
    decisionBoundary:
      "Use it to choose the next human review question, not as proof that a repository process works or as a security, quality, or purchase verdict.",
  });
});

test("serializer fails closed when the required customer-visible input disclosure is absent, altered, or mismatched", async () => {
  const report = analyzePublicTreeSnapshot(await fixture());
  const mutations = [
    (candidate) => { delete candidate.inputDisclosure; },
    (candidate) => { candidate.inputDisclosure.classification = "visitor_verified_repository"; },
    (candidate) => { candidate.inputDisclosure.customerVisibleStatement = "This report is verified."; },
    (candidate) => { candidate.inputDisclosure.decisionBoundary = "Use this as a purchase verdict."; },
    (candidate) => { candidate.snapshot.disclosure.synthetic = false; },
  ];
  for (const mutate of mutations) {
    const candidate = JSON.parse(JSON.stringify(report));
    mutate(candidate);
    assert.throws(
      () => serializePublicTreeReport(candidate),
      (error) => error instanceof PublicTreeSnapshotError && error.code === "invalid_public_tree_snapshot",
    );
  }
});

test("Git-valid case-distinct paths remain distinct while matching dimensions case-insensitively", async () => {
  const input = await fixture();
  input.tree = [
    { path: "AGENTS.md", bytes: 1 },
    { path: "agents.md", bytes: 2 },
  ];
  const report = analyzePublicTreeSnapshot(input);
  assert.deepEqual(report.dimensions[0].evidencePaths, ["AGENTS.md", "agents.md"]);
});

test("CLI analyzes only a supplied snapshot and never accepts an URL or repository execution flag", () => {
  const script = fileURLToPath(cliUrl);
  const success = spawnSync(process.execPath, [script, "analyze", fileURLToPath(fixtureUrl)], {
    encoding: "utf8",
  });
  assert.equal(success.status, 0, success.stderr);
  assert.equal(JSON.parse(success.stdout).reportKind, "agentic_debt_radar_public_tree_report");

  for (const args of [
    ["analyze", "https://github.com/example/warehouse-console"],
    ["clone", fileURLToPath(fixtureUrl)],
    ["analyze", fileURLToPath(fixtureUrl), "--execute"],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.equal(`${result.stdout}${result.stderr}`.includes("IGAA"), false);
  }
});

test("CLI rejects oversized, non-regular, symlinked, and UNC inputs before analysis", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "agentic-debt-radar-mvp-"));
  try {
    const oversized = path.join(directory, "oversized.json");
    await writeFile(oversized, Buffer.alloc((1024 * 1024) + 1, 0x20));
    const oversizedResult = spawnSync(process.execPath, [fileURLToPath(cliUrl), "analyze", oversized], { encoding: "utf8" });
    assert.equal(oversizedResult.status, 1);
    assert.match(oversizedResult.stderr, /one-megabyte/);

    const directoryResult = spawnSync(process.execPath, [fileURLToPath(cliUrl), "analyze", directory], { encoding: "utf8" });
    assert.equal(directoryResult.status, 1);
    assert.match(directoryResult.stderr, /regular local file/);

    const link = path.join(directory, "snapshot-link.json");
    try {
      await symlink(fileURLToPath(fixtureUrl), link, "file");
      const linkResult = spawnSync(process.execPath, [fileURLToPath(cliUrl), "analyze", link], { encoding: "utf8" });
      assert.equal(linkResult.status, 1);
      assert.match(linkResult.stderr, /regular local file/);
    } catch (error) {
      if (error?.code !== "EPERM") throw error;
      t.diagnostic("Windows did not permit creating a test symlink; runtime lstat guard remains statically checked.");
    }

    const uncResult = spawnSync(
      process.execPath,
      [fileURLToPath(cliUrl), "analyze", "\\\\127.0.0.1\\never-contact\\snapshot.json"],
      { encoding: "utf8", timeout: 2_000 },
    );
    assert.equal(uncResult.status, 1);
    assert.match(uncResult.stderr, /local file path/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
