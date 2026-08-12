import { createHash } from "node:crypto";

export const ANALYZER_VERSION = "agentic-debt-radar-public-mvp-v1";
export const DIMENSION_IDS = Object.freeze([
  "agent_context",
  "verification",
  "change_containment",
  "recovery",
  "human_review",
]);

const MAX_TREE_ENTRIES = 10_000;
const MAX_PATH_LENGTH = 240;
const MAX_REPORTED_BYTES = 16 * 1024 * 1024;
const GITHUB_REPOSITORY_URL = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/;

const DIMENSIONS = Object.freeze([
  {
    id: "agent_context",
    label: "Agent context",
    question: "Does the visible tree expose scoped instructions or context for agent-assisted changes?",
    evidence: (paths) => paths.filter((path) =>
      ["agents.md", ".github/copilot-instructions.md", "docs/agent-guidance.md"].includes(path),
    ),
    counterexample:
      "Visible instruction paths do not show whether their guidance is current, scoped correctly, or followed.",
    missingAction:
      "Add one short, public change-boundary note (for example AGENTS.md) that names scope, verification, and human escalation.",
  },
  {
    id: "verification",
    label: "Verification loop",
    question: "Does the visible tree expose a verification loop that a reviewer can inspect?",
    evidence: (paths) => paths.filter((path) =>
      path.startsWith("test/") ||
      path.startsWith("tests/") ||
      path.startsWith(".github/workflows/") ||
      ["scripts/check.js", "scripts/test.js"].includes(path),
    ),
    counterexample:
      "Test or workflow paths do not prove they run, cover the changed behavior, or pass for the current branch.",
    missingAction:
      "Expose one bounded verification command and a matching visible test or workflow path for the next agent-assisted change.",
  },
  {
    id: "change_containment",
    label: "Change containment",
    question: "Does the visible tree expose boundaries that can help contain a change?",
    evidence: (paths) => {
      const roots = ["src/", "lib/", "app/", "test/", "tests/", "docs/", "scripts/"];
      const visibleRoots = roots.filter((root) => paths.some((path) => path.startsWith(root)));
      return visibleRoots.length >= 2 ? visibleRoots : [];
    },
    counterexample:
      "Separate top-level paths do not prove module ownership, dependency direction, or that a change is safely contained.",
    missingAction:
      "Separate the next high-risk change from its verification or operating notes in visible paths, then name the boundary in review.",
  },
  {
    id: "recovery",
    label: "Recovery path",
    question: "Does the visible tree expose a recovery or rollback path?",
    evidence: (paths) => paths.filter((path) =>
      path === "changelog.md" ||
      path.includes("rollback") ||
      path.includes("recovery") ||
      path.startsWith("docs/runbook"),
    ),
    counterexample:
      "A recovery-looking path does not prove the procedure is tested, current, or usable under an incident.",
    missingAction:
      "Document the smallest reversible step for the next agent-assisted change, including when to stop instead of retrying.",
  },
  {
    id: "human_review",
    label: "Human review boundary",
    question: "Does the visible tree expose a human review boundary?",
    evidence: (paths) => paths.filter((path) =>
      ["codeowners", ".github/codeowners", "contributing.md", ".github/pull_request_template.md"].includes(path),
    ),
    counterexample:
      "Review-related paths do not prove the right reviewer sees or approves a change.",
    missingAction:
      "Make the human decision point visible for the next agent-assisted change: who reviews the boundary and what evidence they need.",
  },
]);

export class PublicTreeSnapshotError extends Error {
  constructor(message) {
    super(message);
    this.name = "PublicTreeSnapshotError";
    this.code = "invalid_public_tree_snapshot";
  }
}

function fail(message) {
  throw new PublicTreeSnapshotError(message);
}

export function canonicalJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function exactKeys(value, keys) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()),
  );
}

function normalizePath(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_PATH_LENGTH) {
    fail("Every visible path must be a bounded non-empty string.");
  }
  if (
    value.includes("\\") ||
    value.startsWith("/") ||
    value.includes("//") ||
    value.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    fail("Visible paths must be normalized repository-relative slash paths.");
  }
  return value;
}

function validateRepository(value) {
  if (
    !exactKeys(value, ["publicUrl", "defaultBranch"]) ||
    typeof value.publicUrl !== "string" ||
    !GITHUB_REPOSITORY_URL.test(value.publicUrl) ||
    typeof value.defaultBranch !== "string" ||
    !/^[A-Za-z0-9._/-]{1,120}$/.test(value.defaultBranch)
  ) {
    fail("The snapshot must identify one exact public GitHub repository and default branch.");
  }
  return Object.freeze({ ...value });
}

function validateDisclosure(value) {
  if (
    !exactKeys(value, ["synthetic", "createdFor", "containsRepositoryCode"]) ||
    typeof value.synthetic !== "boolean" ||
    typeof value.createdFor !== "string" ||
    value.createdFor.length === 0 ||
    value.createdFor.length > 160 ||
    typeof value.containsRepositoryCode !== "boolean" ||
    value.containsRepositoryCode !== false
  ) {
    fail("The snapshot disclosure must state that it contains no repository code.");
  }
  return Object.freeze({ ...value });
}

export function validatePublicTreeSnapshot(snapshot) {
  if (
    !exactKeys(snapshot, ["schemaVersion", "snapshotKind", "repository", "tree", "disclosure"]) ||
    snapshot.schemaVersion !== 1 ||
    snapshot.snapshotKind !== "agentic_debt_radar_public_tree_snapshot" ||
    !Array.isArray(snapshot.tree) ||
    snapshot.tree.length === 0 ||
    snapshot.tree.length > MAX_TREE_ENTRIES
  ) {
    fail("The input must be a bounded Agentic Debt Radar public-tree snapshot v1.");
  }
  const paths = new Set();
  const tree = snapshot.tree.map((entry) => {
    if (
      !exactKeys(entry, ["path", "bytes"]) ||
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes < 0 ||
      entry.bytes > MAX_REPORTED_BYTES
    ) {
      fail("Every tree entry must contain only a bounded visible path and reported byte count.");
    }
    const path = normalizePath(entry.path);
    if (paths.has(path)) fail("The snapshot cannot contain duplicate visible paths.");
    paths.add(path);
    return Object.freeze({ path, bytes: entry.bytes });
  });
  return Object.freeze({
    schemaVersion: 1,
    snapshotKind: snapshot.snapshotKind,
    repository: validateRepository(snapshot.repository),
    tree: Object.freeze(tree),
    disclosure: validateDisclosure(snapshot.disclosure),
  });
}

function actionForMissingDimensions(dimensions) {
  const missing = dimensions.filter((dimension) => dimension.observation === "not_visible_in_snapshot");
  return missing.slice(0, 3).map((dimension, index) => ({
    priority: index + 1,
    dimension: dimension.id,
    action: DIMENSIONS.find((definition) => definition.id === dimension.id).missingAction,
    reason: "The relevant visible path was not present in the supplied snapshot; this is a review prompt, not a negative finding.",
  }));
}

function actionForVisibleDimensions(dimensions, existing) {
  for (const dimension of dimensions) {
    if (existing.length >= 3) break;
    if (dimension.observation === "visible_signal") {
      existing.push({
        priority: existing.length + 1,
        dimension: dimension.id,
        action: `Review whether the visible ${dimension.label.toLowerCase()} evidence is current and covers the next agent-assisted change.`,
        reason: dimension.counterexample,
      });
    }
  }
  return existing;
}

function inputDisclosureForReport(disclosure) {
  if (disclosure.synthetic) {
    return Object.freeze({
      classification: "synthetic_illustration",
      customerVisibleStatement:
        "This is a synthetic illustration, not evidence about a customer repository, customer problem, or demand.",
      decisionBoundary:
        "Use it only to evaluate whether the report format and limitations are understandable; do not use it to make repository or purchase decisions.",
    });
  }
  return Object.freeze({
    classification: "locally_supplied_public_tree_snapshot",
    customerVisibleStatement:
      "This report reflects only a locally supplied public-tree snapshot. The repository URL, default branch, and tree completeness were not remotely verified.",
    decisionBoundary:
      "Use it to choose the next human review question, not as proof that a repository process works or as a security, quality, or purchase verdict.",
  });
}

function hasExpectedInputDisclosure(value, expected) {
  return exactKeys(value, ["classification", "customerVisibleStatement", "decisionBoundary"]) &&
    value.classification === expected.classification &&
    value.customerVisibleStatement === expected.customerVisibleStatement &&
    value.decisionBoundary === expected.decisionBoundary;
}

export function analyzePublicTreeSnapshot(snapshot) {
  const valid = validatePublicTreeSnapshot(snapshot);
  const paths = valid.tree.map(({ path }) => path);
  const normalizedPaths = paths.map((path) => path.toLowerCase());
  const dimensions = DIMENSIONS.map((definition) => {
    const normalizedEvidencePaths = definition.evidence(normalizedPaths);
    const matchingIndexes = new Map();
    normalizedPaths.forEach((normalizedPath, index) => {
      const indexes = matchingIndexes.get(normalizedPath) ?? [];
      indexes.push(index);
      matchingIndexes.set(normalizedPath, indexes);
    });
    const occurrences = new Map();
    const evidencePaths = normalizedEvidencePaths.map((evidencePath) => {
      const occurrence = occurrences.get(evidencePath) ?? 0;
      const exactIndex = matchingIndexes.get(evidencePath)?.[occurrence] ?? -1;
      occurrences.set(evidencePath, occurrence + 1);
      return exactIndex >= 0 ? paths[exactIndex] : evidencePath;
    });
    return Object.freeze({
      id: definition.id,
      label: definition.label,
      question: definition.question,
      observation: evidencePaths.length > 0 ? "visible_signal" : "not_visible_in_snapshot",
      evidencePaths,
      counterexample: definition.counterexample,
      limitation: "This observation uses path names and reported sizes only; no file contents or runtime behavior were inspected.",
    });
  });
  const actions = actionForVisibleDimensions(dimensions, actionForMissingDimensions(dimensions));
  const source = canonicalJson(valid);
  return Object.freeze({
    schemaVersion: 1,
    reportKind: "agentic_debt_radar_public_tree_report",
    analyzerVersion: ANALYZER_VERSION,
    repository: valid.repository,
    snapshot: {
      entryCount: valid.tree.length,
      totalReportedBytes: valid.tree.reduce((total, entry) => total + entry.bytes, 0),
      disclosure: valid.disclosure,
      provenance: {
        kind: "locally_supplied_unverified_no_remote_verification",
        repositoryUrlVerified: false,
        defaultBranchVerified: false,
        treeCompletenessVerified: false,
      },
      sha256: createHash("sha256").update(source, "utf8").digest("hex"),
    },
    scope: {
      publicTreeOnly: true,
      clonedRepository: false,
      executedRepositoryCode: false,
      readRepositoryFileContents: false,
      networkRequestMade: false,
      credentialRead: false,
    },
    inputDisclosure: inputDisclosureForReport(valid.disclosure),
    marketEvidence: {
      status: "not_established_by_this_report",
      primaryLossesAddressed: ["trust", "message_understanding", "experienced_value"],
      counterexample:
        "A complete report, a visible signal, or a more complete repository does not establish customer demand, experienced value, or willingness to pay.",
      nextHypothesisLayerRule:
        "Change only the nearest evidenced layer: trust/message-understanding, experienced-value, problem strength, paid intent, or real next step.",
    },
    dimensions,
    prioritizedActions: actions,
    limitations: [
      "Path-level evidence cannot show whether a process works in practice.",
      "The supplied repository URL, default branch, and tree completeness were not fetched or remotely verified.",
      "Missing paths may reflect naming, snapshot limits, generated files, or an unobserved process.",
      "This report is not a security audit, code-quality verdict, developer assessment, or AI-authorship assessment.",
    ],
    pilotExpectation: {
      priceUsdPerRepositoryPerMonth: 149,
      status: "expectation_to_test_not_an_offer_or_proven_demand",
    },
  });
}

export function serializePublicTreeReport(report) {
  let expectedInputDisclosure;
  try {
    expectedInputDisclosure = inputDisclosureForReport(validateDisclosure(report?.snapshot?.disclosure));
  } catch {
    expectedInputDisclosure = undefined;
  }
  const valid = report?.reportKind === "agentic_debt_radar_public_tree_report" &&
    report?.analyzerVersion === ANALYZER_VERSION &&
    Array.isArray(report?.dimensions) &&
    report.dimensions.length === DIMENSION_IDS.length &&
    Array.isArray(report?.prioritizedActions) &&
    report.prioritizedActions.length === 3 &&
    expectedInputDisclosure !== undefined &&
    hasExpectedInputDisclosure(report.inputDisclosure, expectedInputDisclosure);
  if (!valid) fail("Only a complete MVP public-tree report can be serialized.");
  return canonicalJson(report);
}
