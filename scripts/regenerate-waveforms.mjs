#!/usr/bin/env node

// Re-downloads every track's audio from R2 into ./local-audio, re-decodes it
// with ffmpeg, and rewrites waveform_preview in the local D1 database using
// the RMS-based peak logic from src/lib/waveform.ts (kept in sync manually —
// that file runs in the browser via AudioContext, so it can't be imported
// here directly).
//
// Usage:
//   node scripts/regenerate-waveforms.mjs            (targets local D1)
//   node scripts/regenerate-waveforms.mjs --remote    (targets prod D1)

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { AwsClient } from "aws4fetch";

const ROOT = path.resolve(import.meta.dirname, "..");
const AUDIO_DIR = path.join(ROOT, "local-audio");
const BUCKET_NAME = "mix-vault";
const D1_DB_NAME = "mix-vault";
const PEAK_COUNT = 200;

function loadDevVars() {
  const text = readFileSync(path.join(ROOT, ".dev.vars"), "utf8");
  const vars = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return vars;
}

function loadAccountId() {
  const text = readFileSync(path.join(ROOT, "wrangler.jsonc"), "utf8");
  const match = text.match(/"R2_ACCOUNT_ID":\s*"([^"]+)"/);
  if (!match) throw new Error("Could not find R2_ACCOUNT_ID in wrangler.jsonc");
  return match[1];
}

function runWrangler(args) {
  const result = spawnSync("npx", ["wrangler", ...args], { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`wrangler ${args.join(" ")} failed:\n${result.stderr}`);
  }
  return result.stdout;
}

function fetchTracks(dbFlag) {
  const stdout = runWrangler([
    "d1",
    "execute",
    D1_DB_NAME,
    dbFlag,
    "--json",
    "--command",
    "SELECT id, audio_file FROM tracks",
  ]);
  const [{ results }] = JSON.parse(stdout);
  return results;
}

async function downloadAudio(aws, endpoint, key, destPath) {
  const url = `${endpoint}/${BUCKET_NAME}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const res = await aws.fetch(url);
  if (!res.ok) throw new Error(`R2 GET ${key} failed (${res.status})`);
  writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
}

// Decodes the audio file to mono 32-bit float PCM at its native sample rate
// via ffmpeg, then computes PEAK_COUNT RMS buckets — mirroring the
// browser-side logic in src/lib/waveform.ts.
function computePeaks(filePath) {
  const result = spawnSync("ffmpeg", ["-i", filePath, "-f", "f32le", "-ac", "1", "-"], {
    maxBuffer: 1024 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`ffmpeg decode failed for ${filePath}:\n${result.stderr}`);
  }
  const pcm = result.stdout;
  const sampleCount = Math.floor(pcm.length / 4);
  const samples = new Float32Array(pcm.buffer, pcm.byteOffset, sampleCount);

  const samplesPerPeak = Math.max(1, Math.floor(samples.length / PEAK_COUNT));
  const peaks = [];
  for (let peakIndex = 0; peakIndex < PEAK_COUNT; peakIndex++) {
    const start = peakIndex * samplesPerPeak;
    const end = Math.min(start + samplesPerPeak, samples.length);
    let sumSquares = 0;
    let count = 0;
    for (let i = start; i < end; i++) {
      sumSquares += samples[i] * samples[i];
      count++;
    }
    const rms = count > 0 ? Math.sqrt(sumSquares / count) : 0;
    peaks.push(Math.round(rms * 1000) / 1000);
  }
  return peaks;
}

function updateWaveform(id, peaks, dbFlag) {
  const json = JSON.stringify(peaks).replace(/'/g, "''");
  runWrangler([
    "d1",
    "execute",
    D1_DB_NAME,
    dbFlag,
    "--command",
    `UPDATE tracks SET waveform_preview = '${json}' WHERE id = '${id}'`,
  ]);
}

async function main() {
  const dbFlag = process.argv.includes("--remote") ? "--remote" : "--local";
  if (!existsSync(AUDIO_DIR)) mkdirSync(AUDIO_DIR, { recursive: true });

  const devVars = loadDevVars();
  const accountId = loadAccountId();
  const aws = new AwsClient({
    accessKeyId: devVars.R2_ACCESS_KEY_ID,
    secretAccessKey: devVars.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  const tracks = fetchTracks(dbFlag);
  console.log(`Found ${tracks.length} track(s) in ${dbFlag === "--remote" ? "prod" : "local"} DB.`);

  for (const track of tracks) {
    const destPath = path.join(AUDIO_DIR, `${track.id}${path.extname(track.audio_file)}`);
    if (!existsSync(destPath)) {
      console.log(`Downloading ${track.audio_file} -> ${path.relative(ROOT, destPath)}`);
      await downloadAudio(aws, endpoint, track.audio_file, destPath);
    } else {
      console.log(`Already downloaded: ${path.relative(ROOT, destPath)}`);
    }

    console.log(`Computing waveform for ${track.id}...`);
    const peaks = computePeaks(destPath);
    updateWaveform(track.id, peaks, dbFlag);
    console.log(`Updated waveform_preview for ${track.id}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
