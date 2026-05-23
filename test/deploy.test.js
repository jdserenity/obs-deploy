import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findPluginRoot,
  loadManifest,
  loadDeployConfig,
  pluginDirName,
  resolvePluginTargets,
  copyArtifacts,
  deploy
} from "../src/deploy.mjs";

function writeJson(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2));
}

test("findPluginRoot walks up to manifest.json", () => {
  const root = mkdtempSync(join(tmpdir(), "obs-deploy-"));
  const nested = join(root, "src", "ui");
  mkdirSync(nested, { recursive: true });
  writeJson(join(root, "manifest.json"), { id: "demo" });
  assert.equal(findPluginRoot(nested), root);
  assert.equal(findPluginRoot("/"), null);
});

test("loadManifest requires id", () => {
  const root = mkdtempSync(join(tmpdir(), "obs-deploy-"));
  writeJson(join(root, "manifest.json"), { name: "x" });
  assert.throws(() => loadManifest(root), /id/);
});

test("loadDeployConfig requires vaults", () => {
  const root = mkdtempSync(join(tmpdir(), "obs-deploy-"));
  const cfg = join(root, "deploy.json");
  writeJson(cfg, { vaults: [] });
  assert.throws(() => loadDeployConfig(cfg), /vaults/);
});

test("pluginDirName uses manifest id unless overridden", () => {
  assert.equal(pluginDirName({ id: "streak-tracker" }, {}), "streak-tracker");
  assert.equal(pluginDirName({ id: "streak-tracker" }, { pluginDir: "custom" }), "custom");
});

test("resolvePluginTargets builds .obsidian/plugins paths", () => {
  const targets = resolvePluginTargets(["/vault/a", "/vault/b"], "my-plugin");
  assert.deepEqual(targets, [
    "/vault/a/.obsidian/plugins/my-plugin",
    "/vault/b/.obsidian/plugins/my-plugin"
  ]);
});

test("copyArtifacts copies main, styles, manifest", () => {
  const pluginRoot = mkdtempSync(join(tmpdir(), "obs-deploy-"));
  const vault = mkdtempSync(join(tmpdir(), "obs-vault-"));
  const target = join(vault, ".obsidian", "plugins", "demo");
  mkdirSync(join(pluginRoot, "dist"), { recursive: true });
  writeFileSync(join(pluginRoot, "dist", "main.js"), "bundle");
  writeFileSync(join(pluginRoot, "styles.css"), "css");
  writeJson(join(pluginRoot, "manifest.json"), { id: "demo" });
  copyArtifacts(pluginRoot, target);
  assert.equal(readFileSync(join(target, "main.js"), "utf8"), "bundle");
  assert.equal(readFileSync(join(target, "styles.css"), "utf8"), "css");
  assert.ok(existsSync(join(target, "manifest.json")));
});

test("deploy dry-run skips copy but resolves targets", () => {
  const pluginRoot = mkdtempSync(join(tmpdir(), "obs-deploy-"));
  const vault = mkdtempSync(join(tmpdir(), "obs-vault-"));
  const cfg = join(pluginRoot, "deploy.json");
  mkdirSync(join(pluginRoot, "dist"), { recursive: true });
  writeFileSync(join(pluginRoot, "dist", "main.js"), "x");
  writeFileSync(join(pluginRoot, "styles.css"), "");
  writeJson(join(pluginRoot, "manifest.json"), { id: "demo" });
  writeJson(cfg, { vaults: [vault] });
  const out = deploy({ cwd: pluginRoot, configPath: cfg, dryRun: true, skipBuild: true });
  assert.equal(out.pluginId, "demo");
  assert.equal(out.results.length, 1);
  assert.ok(out.results[0].copied[0].dryRun);
  assert.equal(existsSync(join(vault, ".obsidian", "plugins", "demo", "main.js")), false);
});
