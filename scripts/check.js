import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  analyzePublicTreeSnapshot,
  canonicalJson,
  serializePublicTreeReport,
  validatePublicTreeSnapshot,
} from "../src/analyze-public-tree.js";

const repositoryRoot = path.resolve(import.meta.dirname, "..");

async function collectJavaScriptFiles(relativePath) {
  const directory = path.join(repositoryRoot, relativePath);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.join(relativePath, entry.name);
    if (entry.isDirectory()) files.push(...await collectJavaScriptFiles(child));
    if (entry.isFile() && entry.name.endsWith(".js")) files.push(child);
  }
  return files;
}

const manifest = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8"));
for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
  assert.deepEqual(manifest[field] ?? {}, {}, `MVP must retain zero ${field}.`);
}

const contract = JSON.parse(await readFile(
  path.join(repositoryRoot, "contract/agentic-debt-radar-mvp.v1.json"),
  "utf8",
));
assert.equal(contract.id, "agentic-debt-radar-public-mvp-v1");
assert.equal(contract.operator.companyClaimed, false);
assert.deepEqual(contract.evidenceMapping.primaryLossesAddressed, [
  "trust",
  "message_understanding",
  "experienced_value",
]);
assert.equal(contract.pilot.expectedPriceUsdPerRepositoryPerMonth, 149);
assert.match(contract.pilot.priceStatus, /expectation/);
assert.equal(contract.dimensions.length, 5);
assert.match(contract.evidenceMapping.nearestHypothesisLayerRule, /nearest layer/);

const fixture = JSON.parse(await readFile(
  path.join(repositoryRoot, "fixtures/synthetic-public-tree.v1.json"),
  "utf8",
));
const expectedReportSource = await readFile(
  path.join(repositoryRoot, "examples/synthetic-public-tree.report.v1.json"),
  "utf8",
);
const report = analyzePublicTreeSnapshot(validatePublicTreeSnapshot(fixture));
assert.equal(expectedReportSource, serializePublicTreeReport(report));
assert.equal(canonicalJson(fixture), await readFile(
  path.join(repositoryRoot, "fixtures/synthetic-public-tree.v1.json"),
  "utf8",
));

const runtimeFiles = [
  ...await collectJavaScriptFiles("src"),
  ...await collectJavaScriptFiles("bin"),
];
const allowedNodeImports = new Map([
  ["src/analyze-public-tree.js", ["node:crypto"]],
  ["bin/agentic-debt-radar.js", ["node:fs/promises", "node:url"]],
]);
for (const file of runtimeFiles) {
  const source = await readFile(path.join(repositoryRoot, file), "utf8");
  const contractFile = file.replaceAll("\\", "/");
  const imports = [...source.matchAll(/from\s+["'](node:[^"']+)["']/g)].map((match) => match[1]).sort();
  assert.deepEqual(imports, [...(allowedNodeImports.get(contractFile) ?? [])].sort(), `${contractFile} has an unreviewed Node import.`);
  for (const forbidden of [
    /\bfetch\s*\(/,
    /node:(?:child_process|net|http|https|http2|dns|tls|dgram)/,
    /\b(?:exec|execFile|spawn|fork)\s*\(/,
  ]) {
    assert.equal(forbidden.test(source), false, `${contractFile} crosses the offline execution boundary.`);
  }
}
const analyzerSource = await readFile(path.join(repositoryRoot, "src/analyze-public-tree.js"), "utf8");
assert.equal(analyzerSource.includes("readFile("), false);

const files = await Promise.all(runtimeFiles.map(async (file) => {
  await import(pathToFileUrl(path.join(repositoryRoot, file)));
  return file;
}));

function pathToFileUrl(file) {
  return new URL(`file:///${file.replaceAll("\\", "/")}`);
}

process.stdout.write(`check: ok (zero dependencies, ${files.length} source modules, canonical public example)\n`);
