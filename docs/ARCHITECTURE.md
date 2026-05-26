# obs-deploy — Architecture

CLI `obs-deploy` (Node ESM, no runtime dependencies). Single file: `bin/obs-deploy.mjs` (core logic + CLI entry).

## Flow

1. Walk up from `cwd` until `manifest.json` → plugin repo root.
2. Read `manifest.id` (or `.obs-deploy.json` `pluginDir` override).
3. Read `~/.config/obsidian/deploy.json` (`vaults`: array of vault root paths). Override via `OBS_DEPLOY_CONFIG` or `--config`.
4. Unless `--no-build` or local `skipBuild`: `npm run build` in plugin root.
5. For each vault: `mkdir -p <vault>/.obsidian/plugins/<id>/` and copy:
   - `dist/main.js` → `main.js`
   - `manifest.json`
   - `styles.css` if present (otherwise logs `styles.css not found` and continues)

## Layout

| Path | Role |
|------|------|
| `bin/obs-deploy.mjs` | Single file: core logic (exported for tests) + CLI |
| `config/deploy.json.example` | Machine config template |
| `test/deploy.test.js` | `node --test` |

Install: `scripts/install.sh` copies `bin/obs-deploy.mjs` to `~/.local/bin/obs-deploy`. Do not use `npm link`.
