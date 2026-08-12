import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serializedExample = "examples/synthetic-public-tree.report.v1.json";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, cwd, environment = {}) {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      env: { ...process.env, ...environment },
      shell: process.platform === "win32" && command === npmCommand,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
  } catch (error) {
    const detail = [error.message, error.stdout, error.stderr, ...(error.output ?? [])]
      .filter(Boolean)
      .map((value) => Buffer.isBuffer(value) ? value.toString("utf8") : String(value))
      .join("\n")
      .trim();
    throw new Error(`${command} ${args.join(" ")} failed${detail ? `:\n${detail}` : ""}`, { cause: error });
  }
}

function trackedPaths() {
  return run("git", ["ls-files", "-z"], repositoryRoot)
    .split("\0")
    .filter(Boolean);
}

async function seedCurrentTrackedFiles(seedDirectory) {
  for (const relativePath of trackedPaths()) {
    const source = path.join(repositoryRoot, relativePath);
    const destination = path.join(seedDirectory, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { force: true });
  }
}

test("a fresh core.autocrlf=true clone preserves LF serialized contracts", { skip: process.env.EOL_PORTABILITY_NESTED === "1" }, async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "agentic-debt-radar-eol-"));
  const seedDirectory = path.join(temporaryRoot, "seed");
  const checkoutDirectory = path.join(temporaryRoot, "checkout");

  try {
    await mkdir(seedDirectory, { recursive: true });
    await seedCurrentTrackedFiles(seedDirectory);
    run("git", ["init", "--quiet"], seedDirectory);
    run("git", ["config", "user.name", "eol-portability-test"], seedDirectory);
    run("git", ["config", "user.email", "eol-portability-test@example.invalid"], seedDirectory);
    run("git", ["add", "--all"], seedDirectory);
    run("git", ["commit", "--quiet", "-m", "temporary eol portability fixture"], seedDirectory);

    run("git", ["-c", "core.autocrlf=true", "clone", "--quiet", "--no-local", seedDirectory, checkoutDirectory], temporaryRoot);

    const checkedOutExample = await readFile(path.join(checkoutDirectory, serializedExample));
    assert.equal(checkedOutExample.includes(Buffer.from("\r\n")), false, "serialized example must remain LF in a core.autocrlf=true clone");
    assert.equal(checkedOutExample.includes(Buffer.from("\n")), true, "serialized example must contain LF line endings");

    run(npmCommand, ["run", "check"], checkoutDirectory);
    run(npmCommand, ["test"], checkoutDirectory, { EOL_PORTABILITY_NESTED: "1" });
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
