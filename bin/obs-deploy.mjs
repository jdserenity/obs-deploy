#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_CONFIG_PATH = join(homedir(), ".config", "obsidian", "deploy.json");

export function findPluginRoot(startDir) {
  let dir = resolve(startDir);
  for (;;) {
    if (existsSync(join(dir, "manifest.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function loadManifest(pluginRoot) {
  const raw = readFileSync(join(pluginRoot, "manifest.json"), "utf8");
  const manifest = JSON.parse(raw);
  if (!manifest.id || typeof manifest.id !== "string") throw new Error("manifest.json must have a string \"id\"");
  return manifest;
}

export function loadDeployConfig(configPath) {
  if (!existsSync(configPath)) throw new Error(`Deploy config not found: ${configPath}\nCopy config/deploy.json.example to ${configPath}`);
  const raw = readFileSync(configPath, "utf8");
  const config = JSON.parse(raw);
  if (!Array.isArray(config.vaults) || config.vaults.length === 0) throw new Error("Deploy config must have a non-empty \"vaults\" array");
  return config;
}

export function loadLocalConfig(pluginRoot) {
  const path = join(pluginRoot, ".obs-deploy.json");
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8"));
}

export function pluginDirName(manifest, local) {
  if (local.pluginDir) return local.pluginDir;
  return manifest.id;
}

export function resolvePluginTargets(vaultRoots, pluginId) {
  return vaultRoots.map((vault) => join(resolve(vault), ".obsidian", "plugins", pluginId));
}

export function runBuild(pluginRoot, npmCmd = "npm") {
  const r = spawnSync(npmCmd, ["run", "build"], { cwd: pluginRoot, stdio: "inherit", shell: false });
  if (r.status !== 0) throw new Error("npm run build failed");
}

const ARTIFACTS = {
  main: { src: "dist/main.js", dest: "main.js", required: true },
  styles: { src: "styles.css", dest: "styles.css", required: true },
  manifest: { src: "manifest.json", dest: "manifest.json", required: true }
};

export function copyArtifacts(pluginRoot, targetDir, { dryRun = false } = {}) {
  const copied = [];
  for (const spec of Object.values(ARTIFACTS)) {
    const src = join(pluginRoot, spec.src);
    const dest = join(targetDir, spec.dest);
    if (!existsSync(src)) {
      if (spec.required) throw new Error(`Missing artifact: ${spec.src}`);
      continue;
    }
    if (dryRun) { copied.push({ src, dest, dryRun: true }); continue; }
    mkdirSync(targetDir, { recursive: true });
    copyFileSync(src, dest);
    copied.push({ src, dest });
  }
  return copied;
}

export function deploy({
  cwd = process.cwd(),
  configPath = process.env.OBS_DEPLOY_CONFIG || DEFAULT_CONFIG_PATH,
  dryRun = false,
  skipBuild = false,
  npmCmd = "npm"
} = {}) {
  const pluginRoot = findPluginRoot(cwd);
  if (!pluginRoot) throw new Error("No manifest.json found (run from an Obsidian plugin repo)");
  const manifest = loadManifest(pluginRoot);
  const global = loadDeployConfig(configPath);
  const local = loadLocalConfig(pluginRoot);
  const id = pluginDirName(manifest, local);
  const targets = resolvePluginTargets(global.vaults, id);
  if (!skipBuild && !local.skipBuild) runBuild(pluginRoot, npmCmd);
  const results = [];
  for (const target of targets) {
    const copied = copyArtifacts(pluginRoot, target, { dryRun });
    results.push({ target, copied });
  }
  return { pluginRoot, pluginId: id, targets, results };
}

if (realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
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
}
