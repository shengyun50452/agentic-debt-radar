import { lstat, open } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import {
  PublicTreeSnapshotError,
  analyzePublicTreeSnapshot,
  serializePublicTreeReport,
} from "../src/analyze-public-tree.js";

const MAX_INPUT_BYTES = 1024 * 1024;

function isNetworkOrDevicePath(file) {
  return file.startsWith("\\\\") || file.startsWith("//");
}

export async function loadSnapshot(file) {
  if (typeof file !== "string" || file.length === 0 || isNetworkOrDevicePath(file)) {
    throw new PublicTreeSnapshotError("The supplied snapshot must be a local file path.");
  }
  let metadata;
  try {
    metadata = await lstat(file);
  } catch {
    throw new PublicTreeSnapshotError("The supplied snapshot file could not be inspected.");
  }
  if (metadata.isSymbolicLink() || !metadata.isFile()) {
    throw new PublicTreeSnapshotError("The supplied snapshot must be a regular local file, not a link or special file.");
  }
  if (metadata.size > MAX_INPUT_BYTES) {
    throw new PublicTreeSnapshotError("The supplied snapshot exceeds the one-megabyte MVP input limit.");
  }
  let handle;
  try {
    handle = await open(file, "r");
  } catch {
    throw new PublicTreeSnapshotError("The supplied snapshot file could not be opened.");
  }
  let source;
  try {
    const openedMetadata = await handle.stat();
    if (
      !openedMetadata.isFile() ||
      openedMetadata.ino !== metadata.ino ||
      openedMetadata.size > MAX_INPUT_BYTES
    ) {
      throw new PublicTreeSnapshotError("The supplied snapshot changed or exceeded its bounds before it could be read.");
    }
    source = await handle.readFile("utf8");
  } finally {
    await handle.close();
  }
  if (Buffer.byteLength(source, "utf8") > MAX_INPUT_BYTES) {
    throw new PublicTreeSnapshotError("The supplied snapshot exceeds the one-megabyte MVP input limit.");
  }
  try {
    return JSON.parse(source);
  } catch {
    throw new PublicTreeSnapshotError("The supplied snapshot is not valid JSON.");
  }
}

async function main() {
  const [, , command, file] = process.argv;
  if (command !== "analyze" || typeof file !== "string" || process.argv.length !== 4) {
    throw new PublicTreeSnapshotError("Use: node bin/agentic-debt-radar.js analyze <public-tree-snapshot.json>");
  }
  const snapshot = await loadSnapshot(file);
  process.stdout.write(serializePublicTreeReport(analyzePublicTreeSnapshot(snapshot)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const message = error instanceof PublicTreeSnapshotError
      ? error.message
      : "The public-tree MVP failed closed.";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
