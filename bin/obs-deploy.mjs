#!/usr/bin/env node
import { deploy, DEFAULT_CONFIG_PATH } from "../src/deploy.mjs";

const args = process.argv.slice(2);
let cwd = process.cwd();
let configPath = process.env.OBS_DEPLOY_CONFIG || DEFAULT_CONFIG_PATH;
let dryRun = false;
let skipBuild = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--dry-run") { dryRun = true; continue; }
  if (a === "--no-build") { skipBuild = true; continue; }
  if (a === "--cwd" && args[i + 1]) { cwd = args[++i]; continue; }
  if (a === "--config" && args[i + 1]) { configPath = args[++i]; continue; }
  if (a === "-h" || a === "--help") {
    console.log(`Usage: obs-deploy [--dry-run] [--no-build] [--cwd <dir>] [--config <path>]

Build (npm run build) and copy plugin artifacts into each vault:
  <vault>/.obsidian/plugins/<manifest.id>/

Global config: ${DEFAULT_CONFIG_PATH}  (override with OBS_DEPLOY_CONFIG or --config)
Per-repo override: .obs-deploy.json  (optional pluginDir, skipBuild)

Artifacts: dist/main.js → main.js, styles.css, manifest.json`);
    process.exit(0);
  }
  console.error(`Unknown option: ${a}`);
  process.exit(1);
}

try {
  const out = deploy({ cwd, configPath, dryRun, skipBuild });
  for (const { target, copied } of out.results) {
    console.log(dryRun ? `[dry-run] → ${target}` : `→ ${target}`);
    for (const c of copied) {
      if (c.dryRun) console.log(`  would copy ${c.src} → ${c.dest}`);
    }
  }
  console.log("Done.");
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
