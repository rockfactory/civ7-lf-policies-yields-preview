#!/usr/bin/env node
// Bump the mod version in package.json and the .modinfo, refresh package-lock.json
// via `npm install`, and commit the three files as "Version bump vX.Y.Z".
//
// Usage:
//   node ci/bump-version.mjs --patch | --minor | --major
//   node ci/bump-version.mjs --target <version>     (e.g. 1.5.0 or v1.5.0)
//   node ci/bump-version.mjs --minor --dry-run      (preview, no writes/commit)
//
// The current version is read from package.json; package.json and the <Version>
// element of the .modinfo are set to the new value. The <Mod version="1"> attribute
// (the modinfo format version) is never touched.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const usage = [
  "",
  "Usage:",
  "  node ci/bump-version.mjs --patch | --minor | --major",
  "  node ci/bump-version.mjs --target <version>     (e.g. 1.5.0 or v1.5.0)",
  "  node ci/bump-version.mjs <mode> --dry-run       (preview, no writes/commit)",
  "",
].join("\n");

/**
 * Print an error plus usage and exit non-zero.
 * @param {string} message error message
 * @returns {never}
 */
function fail(message) {
  console.error(`Error: ${message}`);
  console.error(usage);
  process.exit(1);
}

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;

/**
 * Parse an "X.Y.Z" version string into its numeric parts.
 * @param {string} value version string (no leading "v")
 * @returns {{ major: number, minor: number, patch: number }} parsed version
 */
function parseVersion(value) {
  const match = SEMVER_RE.exec(value);
  if (!match) fail(`Invalid version "${value}". Expected X.Y.Z (e.g. 1.5.0).`);
  return { major: +match[1], minor: +match[2], patch: +match[3] };
}

// --- parse args ---
const argv = process.argv.slice(2);
let mode = null; // "patch" | "minor" | "major" | "target"
let targetValue = null;
let dryRun = false;

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--patch" || arg === "--minor" || arg === "--major") {
    if (mode) fail("Specify only one bump mode.");
    mode = arg.slice(2);
  } else if (arg === "--target") {
    if (mode) fail("Specify only one bump mode.");
    mode = "target";
    targetValue = argv[++i];
    if (!targetValue) fail("--target requires a version value (e.g. --target 1.5.0).");
  } else if (arg.startsWith("--target=")) {
    if (mode) fail("Specify only one bump mode.");
    mode = "target";
    targetValue = arg.slice("--target=".length);
  } else if (arg === "--dry-run") {
    dryRun = true;
  } else {
    fail(`Unknown argument: ${arg}`);
  }
}

if (!mode) fail("No bump mode specified.");

// --- read current version from package.json ---
const pkgPath = join(repoRoot, "package.json");
const pkgRaw = readFileSync(pkgPath, "utf8");
const current = parseVersion(JSON.parse(pkgRaw).version);
const currentStr = `${current.major}.${current.minor}.${current.patch}`;

// --- compute new version ---
let next;
if (mode === "target") {
  next = parseVersion(targetValue.replace(/^v/i, ""));
} else {
  next = { ...current };
  if (mode === "major") {
    next.major++;
    next.minor = 0;
    next.patch = 0;
  } else if (mode === "minor") {
    next.minor++;
    next.patch = 0;
  } else {
    next.patch++;
  }
}
const nextStr = `${next.major}.${next.minor}.${next.patch}`;

if (nextStr === currentStr) fail(`Version is already ${currentStr}; nothing to bump.`);

// --- locate the .modinfo ---
const modinfoName = readdirSync(repoRoot).find((name) => name.endsWith(".modinfo"));
if (!modinfoName) fail("No .modinfo file found in repo root.");
const modinfoPath = join(repoRoot, modinfoName);

// --- compute new file contents (also validates the replacements before writing) ---
const newPkgRaw = pkgRaw.replace(/("version"\s*:\s*")[^"]*(")/, `$1${nextStr}$2`);
if (newPkgRaw === pkgRaw) fail('Could not find a "version" field in package.json.');

const modinfoRaw = readFileSync(modinfoPath, "utf8");
const newModinfoRaw = modinfoRaw.replace(/(<Version>)[^<]*(<\/Version>)/, `$1${nextStr}$2`);
if (newModinfoRaw === modinfoRaw) fail(`Could not find a <Version> element in ${modinfoName}.`);

console.log(`Version bump: ${currentStr} -> ${nextStr}`);

if (dryRun) {
  console.log("[dry-run] Would update package.json and " + modinfoName + ".");
  console.log("[dry-run] Would run `npm install` to refresh package-lock.json.");
  console.log(`[dry-run] Would commit: "Version bump v${nextStr}".`);
  process.exit(0);
}

// --- apply ---
writeFileSync(pkgPath, newPkgRaw);
writeFileSync(modinfoPath, newModinfoRaw);

console.log("Running `npm install` to refresh package-lock.json...");
execSync("npm install", { cwd: repoRoot, stdio: "inherit" });

const message = `Version bump v${nextStr}`;
console.log(`Committing: ${message}`);
execSync(
  `git commit -m "${message}" -- package.json package-lock.json "${modinfoName}"`,
  { cwd: repoRoot, stdio: "inherit" }
);

console.log(`Done. Bumped to v${nextStr} and committed.`);
