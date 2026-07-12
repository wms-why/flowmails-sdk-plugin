#!/usr/bin/env node
/**
 * Sync the bundled skill files from the canonical source
 * (../../skills/flowmails-sdk — the wms-why/flowmails-sdk-skill submodule).
 *
 * Run via `pnpm --filter @flowmails/sdk-plugin sync` whenever the canonical
 * skill changes. The bundle in skills/flowmails-sdk/ is what ships to GitHub
 * and to the community marketplace — keep it in lockstep with the canonical
 * repo or agents will see drift between this plugin and the published skill.
 *
 * Use `pnpm --filter @flowmails/sdk-plugin test` (alias `--check`) in CI to
 * fail if the bundle has drifted from the canonical source.
 */
import { readFileSync, writeFileSync, statSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = join(__dirname, "..");
const CANONICAL_SKILL = join(PLUGIN_ROOT, "..", "..", "skills", "flowmails-sdk");
const BUNDLED_SKILL = join(PLUGIN_ROOT, "skills", "flowmails-sdk");

const FILES_TO_SYNC = ["SKILL.md", "README.md", "CONTRIBUTING.md", "LICENSE"];
const REF_FILES = ["errors.md", "examples.md", "payloads.md"];

const checkOnly = process.argv.includes("--check");
const TAG = "[skill-sync]";

const info = (msg) => console.log(`${TAG} ${msg}`);
const warn = (msg) => console.warn(`${TAG} ${msg}`);
const fail = (msg) => {
  console.error(`${TAG} ${msg}`);
  process.exit(1);
};

if (!existsSync(CANONICAL_SKILL)) {
  fail(
    `Canonical skill not found at ${relative(PLUGIN_ROOT, CANONICAL_SKILL)}. ` +
      `Did you forget to init the submodule? Run: git submodule update --init --recursive skills/flowmails-sdk`,
  );
}
if (!statSync(CANONICAL_SKILL).isDirectory()) {
  fail(`Canonical skill path is not a directory: ${CANONICAL_SKILL}`);
}

mkdirSync(BUNDLED_SKILL, { recursive: true });
mkdirSync(join(BUNDLED_SKILL, "references"), { recursive: true });

let drifted = false;

for (const name of FILES_TO_SYNC) {
  const src = join(CANONICAL_SKILL, name);
  const dst = join(BUNDLED_SKILL, name);
  if (!existsSync(src)) continue;
  const srcBuf = readFileSync(src);
  if (existsSync(dst) && readFileSync(dst).equals(srcBuf)) {
    info(`unchanged  ${name}`);
    continue;
  }
  if (checkOnly) {
    drifted = true;
    warn(`DRIFT  ${name}  (run pnpm sync to fix)`);
    continue;
  }
  writeFileSync(dst, srcBuf);
  info(`synced     ${name}`);
}

for (const name of REF_FILES) {
  const src = join(CANONICAL_SKILL, "references", name);
  const dst = join(BUNDLED_SKILL, "references", name);
  if (!existsSync(src)) continue;
  const srcBuf = readFileSync(src);
  if (existsSync(dst) && readFileSync(dst).equals(srcBuf)) {
    info(`unchanged  references/${name}`);
    continue;
  }
  if (checkOnly) {
    drifted = true;
    warn(`DRIFT  references/${name}`);
    continue;
  }
  writeFileSync(dst, srcBuf);
  info(`synced     references/${name}`);
}

if (checkOnly && drifted) {
  fail(
    "Skill bundle has drifted from canonical source. " +
      "Run pnpm --filter @flowmails/sdk-plugin sync and commit the result.",
  );
}
if (!checkOnly) {
  info(`Bundle at ${relative(process.cwd(), BUNDLED_SKILL)} is in lockstep with canonical source.`);
}
