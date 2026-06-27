#!/usr/bin/env node
// Verifies that every runtime script on disk (scripts/**/*.js) is registered in a
// <UIScripts> block of the mod's .modinfo, and that no <UIScripts> entry points at
// a missing file. Exits non-zero so CI fails.

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const scriptsDir = join(repoRoot, "scripts");

/**
 * Find the single *.modinfo file at the repo root.
 * @returns {string} absolute path to the .modinfo file
 */
function findModinfo() {
  const matches = readdirSync(repoRoot).filter((name) => name.endsWith(".modinfo"));
  if (matches.length === 0) {
    throw new Error(`No .modinfo file found in ${repoRoot}`);
  }
  if (matches.length > 1) {
    throw new Error(`Expected exactly one .modinfo file, found: ${matches.join(", ")}`);
  }
  return join(repoRoot, matches[0]);
}

/**
 * Extract every <Item> path that lives inside a <UIScripts>...</UIScripts> block.
 * Other blocks (<UpdateText> also uses <Item>, <LocalizedText> uses <File>) are ignored.
 * @param {string} xml raw .modinfo contents
 * @returns {Set<string>} registered script paths, normalized to forward slashes
 */
function extractRegisteredScripts(xml) {
  const registered = new Set();
  const blockRe = /<UIScripts\b[^>]*>([\s\S]*?)<\/UIScripts>/gi;
  const itemRe = /<Item\b[^>]*>([\s\S]*?)<\/Item>/gi;
  let block;
  while ((block = blockRe.exec(xml)) !== null) {
    let item;
    while ((item = itemRe.exec(block[1])) !== null) {
      const path = item[1].trim().replace(/\\/g, "/");
      if (path) registered.add(path);
    }
  }
  return registered;
}

/**
 * Recursively collect every .js file under scripts/, as repo-root-relative
 * forward-slash paths (e.g. "scripts/core/settings.js").
 * @returns {string[]} sorted list of script paths
 */
function listDiskScripts() {
  return readdirSync(scriptsDir, { recursive: true })
    .map((entry) => String(entry).replace(/\\/g, "/"))
    .filter((entry) => entry.endsWith(".js"))
    .map((entry) => `scripts/${entry}`)
    .sort();
}

const modinfoPath = findModinfo();
const registered = extractRegisteredScripts(readFileSync(modinfoPath, "utf8"));
const diskScripts = listDiskScripts();

// Scripts on disk but not registered in any <UIScripts> block.
const missing = diskScripts.filter((path) => !registered.has(path));

// Registered entries with no corresponding file on disk.
const diskSet = new Set(diskScripts);
const dangling = [...registered].filter((path) => !diskSet.has(path)).sort();

const modinfoName = relative(repoRoot, modinfoPath).replace(/\\/g, "/");

if (missing.length === 0 && dangling.length === 0) {
  console.log(`OK: all ${diskScripts.length} scripts are registered in ${modinfoName}.`);
  process.exit(0);
}

if (missing.length > 0) {
  console.error(`\nERROR: ${missing.length} script(s) on disk are NOT registered in <UIScripts>:`);
  for (const path of missing) console.error(`  - ${path}`);
  console.error(`\nAdd each as <Item>${missing[0]}</Item> inside the appropriate <UIScripts> block.`);
}

if (dangling.length > 0) {
  console.error(`\nERROR: ${dangling.length} <UIScripts> entry(ies) point at a missing file:`);
  for (const path of dangling) console.error(`  - ${path}`);
  console.error(`\nRemove or fix these <Item> entries in ${modinfoName}.`);
}

process.exit(1);
