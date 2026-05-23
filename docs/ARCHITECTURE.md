# obs-deploy — Architecture

CLI `obs-deploy` (Node ESM, no runtime dependencies). Entry: `bin/obs-deploy.mjs` → `src/deploy.mjs`.

## Flow

1. Walk up from `cwd` until `manifest.json` → plugin repo root.
2. Read `manifest.id` (or `.obs-deploy.json` `pluginDir` override).
3. Read `~/.config/obsidian/deploy.json` (`vaults`: array of vault root paths). Override via `OBS_DEPLOY_CONFIG` or `--config`.
4. Unless `--no-build` or local `skipBuild`: `npm run build` in plugin root.
5. For each vault: `mkdir -p <vault>/.obsidian/plugins/<id>/` and copy:
   - `dist/main.js` → `main.js`
   - `styles.css`
   - `manifest.json`

## Layout

| Path | Role |
|------|------|
| `src/deploy.mjs` | Core logic (exported for tests) |
| `bin/obs-deploy.mjs` | CLI flags: `--dry-run`, `--no-build`, `--cwd`, `--config` |
| `config/deploy.json.example` | Machine config template |
| `test/deploy.test.js` | `node --test` |

Install: `npm link` exposes the `bin` script globally.
