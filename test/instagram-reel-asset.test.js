import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const metadataPath = path.join(repositoryRoot, "assets/instagram/agentic-debt-radar-reel-v1.asset.v1.json");

test("Instagram Reel asset stays within the private release size and AAC eligibility contract", async () => {
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  const assetPath = path.join(repositoryRoot, metadata.assetPath);
  const asset = await readFile(assetPath);

  assert.equal(metadata.schemaVersion, 1);
  assert.equal(metadata.id, "agentic-debt-radar-instagram-reel-v1");
  assert.equal((await stat(assetPath)).size, metadata.bytes);
  assert.equal(metadata.bytes <= metadata.maxBytes, true);
  assert.equal(metadata.maxBytes, 8 * 1024 * 1024);
  assert.equal(createHash("sha256").update(asset).digest("hex"), metadata.sha256);

  assert.deepEqual(metadata.video, {
    codec: "H264",
    width: 1080,
    height: 1920,
    durationMs: 33067,
    frameRateMilliFps: 30000,
    propertySystemVideoBitrate: 1552472,
    rotation: 0,
    composition: "one_untrimmed_source_clip",
  });
  assert.equal(metadata.audio.trackCount, 1);
  assert.equal(metadata.audio.codec, "AAC");
  assert.equal(metadata.audio.sampleRateHz, 48000);
  assert.equal(metadata.audio.channels, 2);
  assert.match(metadata.audio.silenceContract, /every sample was zero/);

  const qa = metadata.sourcePreservation.frameQa;
  assert.deepEqual(qa.sampleTimesMs, [1000, 16533, 32000]);
  assert.equal(qa.source.length, 3);
  assert.equal(qa.encoded.length, 3);
  for (const sample of [...qa.source, ...qa.encoded]) {
    assert.match(sample.pixelSha256, /^[a-f0-9]{64}$/);
    assert.equal(sample.nonBlackPercent > 99, true);
  }
  assert.match(qa.interpretation, /not a pixel-equality claim/);
});
