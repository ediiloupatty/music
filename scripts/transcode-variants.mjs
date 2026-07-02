// Generate MP3 quality variants (320 / 128 kbps) for every audio file in the
// R2 bucket, so the app's Streaming Quality setting has something to serve.
//
//   node scripts/transcode-variants.mjs           # transcode everything missing
//   node scripts/transcode-variants.mjs --dry-run # only report what would run
//
// Variants are written next to the originals under prefix folders:
//   q320/<original-path>.mp3
//   q128/<original-path>.mp3
// The /api/audio route rewrites ?q=320/?q=128 requests to those keys and falls
// back to the original when a variant is missing, so this script is safe to run
// incrementally / interrupt at any time.
//
// Requires: ffmpeg on PATH, and the same .env the app uses
// (CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME).

import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { spawnSync } from "child_process";
import { createWriteStream } from "fs";
import { mkdtemp, readFile, rm } from "fs/promises";
import { pipeline } from "stream/promises";
import { tmpdir } from "os";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME || "music";

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error("Missing R2 credentials in .env (CLOUDFLARE_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");
// --limit N: only process the first N missing variants (handy for a test run).
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg >= 0 ? parseInt(process.argv[limitArg + 1], 10) || 0 : 0;
const AUDIO_EXT = new Set([".flac", ".wav", ".mp3", ".m4a", ".aac", ".ogg", ".opus", ".webm"]);
const VARIANTS = [
  { prefix: "q320/", bitrate: "320k" },
  { prefix: "q128/", bitrate: "128k" },
];

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

async function listAllKeys() {
  const keys = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
    for (const obj of res.Contents || []) keys.push(obj.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

function variantKeyFor(prefix, key) {
  return prefix + key.replace(/\.[^./]+$/, "") + ".mp3";
}

async function main() {
  console.log(`Listing bucket "${bucket}"...`);
  const allKeys = await listAllKeys();
  const existing = new Set(allKeys);

  const originals = allKeys.filter((k) => {
    if (VARIANTS.some((v) => k.startsWith(v.prefix))) return false;
    return AUDIO_EXT.has(path.extname(k).toLowerCase());
  });

  // Lossless originals (flac/wav) get both variants. Already-lossy originals
  // (mp3/aac/...) only get the 128k data-saver variant — a "320k" re-encode of
  // a lossy file gains nothing, and /api/audio falls back to the original for
  // ?q=320 when the variant doesn't exist, which is the better outcome.
  const LOSSLESS_EXT = new Set([".flac", ".wav"]);
  const jobs = [];
  for (const key of originals) {
    const lossless = LOSSLESS_EXT.has(path.extname(key).toLowerCase());
    for (const v of VARIANTS) {
      if (!lossless && v.prefix === "q320/") continue;
      const target = variantKeyFor(v.prefix, key);
      if (!existing.has(target)) jobs.push({ key, target, bitrate: v.bitrate });
    }
  }

  console.log(`${originals.length} audio files, ${jobs.length} variant(s) missing.`);
  if (LIMIT > 0) {
    jobs.length = Math.min(jobs.length, LIMIT);
    console.log(`--limit ${LIMIT}: processing ${jobs.length} variant(s) this run.`);
  }
  if (DRY_RUN || jobs.length === 0) {
    if (DRY_RUN) for (const j of jobs) console.log(`  would create ${j.target} (${j.bitrate})`);
    return;
  }

  const workDir = await mkdtemp(path.join(tmpdir(), "zenify-transcode-"));
  let done = 0, failed = 0;
  // Cache the downloaded original across its two variants (jobs are grouped per key).
  let cachedKey = null, cachedFile = null;

  for (const job of jobs) {
    const label = `[${done + failed + 1}/${jobs.length}]`;
    try {
      if (cachedKey !== job.key) {
        cachedFile = path.join(workDir, "src" + path.extname(job.key));
        const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: job.key }));
        await pipeline(res.Body, createWriteStream(cachedFile));
        cachedKey = job.key;
      }

      const outFile = path.join(workDir, "out.mp3");
      const ff = spawnSync("ffmpeg", [
        "-y", "-hide_banner", "-loglevel", "error",
        "-i", cachedFile,
        "-vn",                     // strip embedded cover art video stream
        "-codec:a", "libmp3lame",
        "-b:a", job.bitrate,
        "-map_metadata", "0",      // keep tags (title/artist/album)
        outFile,
      ], { encoding: "utf-8" });
      if (ff.status !== 0) throw new Error(`ffmpeg: ${ff.stderr || ff.status}`);

      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: job.target,
        Body: await readFile(outFile),
        ContentType: "audio/mpeg",
      }));
      done++;
      console.log(`${label} OK  ${job.target}`);
    } catch (err) {
      failed++;
      console.error(`${label} FAIL ${job.target}: ${err.message}`);
    }
  }

  await rm(workDir, { recursive: true, force: true });
  console.log(`\nDone: ${done} created, ${failed} failed.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
