# obs-deploy

Build an Obsidian plugin repo and copy deploy artifacts into every configured vault at `.obsidian/plugins/<manifest.id>/`.

## Install

```bash
cd /path/to/obs-deploy
npm link
```

`obs-deploy` is then on your PATH. Requires Node 18+.

## Config (once per machine)

```bash
mkdir -p ~/.config/obsidian
cp config/deploy.json.example ~/.config/obsidian/deploy.json
# edit vault roots (paths to vault folders, not .obsidian)
```

Optional per-repo `.obs-deploy.json`:

```json
{ "pluginDir": "only-if-folder-differs-from-manifest-id", "skipBuild": false }
```

## Use (from any plugin repo)

```bash
obs-deploy              # npm run build, then copy to all vaults
obs-deploy --dry-run    # show targets without copying
obs-deploy --no-build   # copy only (artifacts must already exist)
```

Override config path: `OBS_DEPLOY_CONFIG` or `--config /path/to/deploy.json`.

## Tests

```bash
npm test
```
