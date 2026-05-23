import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

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
    if (dryRun) {
      copied.push({ src, dest, dryRun: true });
      continue;
    }
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
