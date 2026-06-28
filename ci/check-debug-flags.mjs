#!/usr/bin/env node
// Verifies that debug flags which must never ship enabled are always assigned
// `false` in committed code. Any assignment to a non-false value (e.g. a flag
// left on after local debugging) fails CI. Only assignments are checked;
// usages such as `if (LF_DEBUG_WARNINGS)`, comparisons (`=== true`), imports,
// and comments are ignored.

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// Flags that must always be `false` in committed code.
const FLAGS = ["LF_DEBUG_WARNINGS", "LF_DEBUG_CHEATS_ENABLED"];

const IGNORED_DIRS = new Set(["node_modules", ".git"]);

/**
 * Recursively collect every .js / .mjs file under a directory, skipping
 * node_modules and .git.
 * @param {string} dir directory to walk
 * @returns {string[]} absolute file paths
 */
function listSourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) out.push(...listSourceFiles(join(dir, entry.name)));
    } else if (/\.m?js$/.test(entry.name)) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

const files = listSourceFiles(repoRoot);
const violations = [];

for (const flag of FLAGS) {
  // Match an assignment `FLAG = <value>` but not a comparison (`==` / `===`).
  const re = new RegExp(`\\b${flag}\\b\\s*=(?!=)\\s*([^;\\n]*)`);
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      const match = re.exec(line);
      if (match && match[1].trim() !== "false") {
        violations.push({
          file: relative(repoRoot, file).replace(/\\/g, "/"),
          line: i + 1,
          flag,
          value: match[1].trim(),
          text: line.trim(),
        });
      }
    });
  }
}

if (violations.length === 0) {
  console.log(`OK: ${FLAGS.join(", ")} are assigned \`false\` everywhere.`);
  process.exit(0);
}

console.error(`\nERROR: ${violations.length} debug-flag assignment(s) are not \`false\`:`);
for (const v of violations) {
  console.error(`  - ${v.file}:${v.line}  (${v.flag} = ${v.value})`);
  console.error(`      ${v.text}`);
}
console.error(`\nThese flags must be committed as \`false\`. Set them back before merging.`);
process.exit(1);
