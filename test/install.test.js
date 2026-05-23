import { existsSync, lstatSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("install.sh copies a single executable file into ~/.local/bin", () => {
  const home = mkdtempSync(join(tmpdir(), "obs-install-"));
  const binDir = join(home, ".local/bin");
  const env = { ...process.env, HOME: home, OBS_DEPLOY_BIN_DIR: binDir };
  const r = spawnSync("bash", [join(repoRoot, "scripts/install.sh")], { env, encoding: "utf8" });
  assert.equal(r.status, 0, [r.stdout, r.stderr].filter(Boolean).join("\n"));
  const bin = join(binDir, "obs-deploy");
  assert.ok(existsSync(bin));
  assert.ok(lstatSync(bin).isFile());
  assert.ok(!lstatSync(bin).isSymbolicLink());
  const help = spawnSync(bin, ["--help"], { env, encoding: "utf8" });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /obs-deploy/);
});
