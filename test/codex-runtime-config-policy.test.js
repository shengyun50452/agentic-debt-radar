import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const configRelativePath = ".codex/config.toml";
const testRelativePath = "test/codex-runtime-config-policy.test.js";
const attributesRelativePath = ".gitattributes";
const expectedConfig = [
  "# Project-scoped runtime defaults for direct Codex tasks in this public repository.",
  'model = "gpt-5.6-sol"',
  'model_reasoning_effort = "max"',
  "",
  "[agents]",
  'default_subagent_model = "gpt-5.6-terra"',
  'default_subagent_reasoning_effort = "high"',
  "max_concurrent_threads_per_session = 8",
  "",
  "# Dispatch xhigh explicitly only for cross-module, release, security, or difficult debugging work.",
  "",
].join("\n");

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test("public Codex runtime policy and its test are exact and tracked in the Git index", async () => {
  const workingTreeConfig = (await readFile(path.join(repositoryRoot, configRelativePath), "utf8"))
    .replaceAll("\r\n", "\n");
  const workingTreeTest = (await readFile(path.join(repositoryRoot, testRelativePath), "utf8"))
    .replaceAll("\r\n", "\n");
  assert.equal(workingTreeConfig, expectedConfig);

  runGit([
    "ls-files",
    "--error-unmatch",
    "--",
    attributesRelativePath,
    configRelativePath,
    testRelativePath,
  ]);
  for (const relativePath of [configRelativePath, testRelativePath]) {
    assert.equal(runGit(["check-attr", "eol", "--", relativePath]).trim(), `${relativePath}: eol: lf`);
  }
  assert.equal(runGit(["show", `:${configRelativePath}`]), expectedConfig);
  assert.equal(runGit(["show", `:${testRelativePath}`]), workingTreeTest);
});
