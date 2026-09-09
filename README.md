# Home Assistant config

Snapshot of the HA instance at `192.168.20.30:8123` (HA OS 2025.7.4), tracked in git.

## Two separate things

| | what | where |
|---|---|---|
| **Restore backups** | full backup (config + database + add-ons), encrypted, daily, keeps 3 | on the HA box, Settings → System → Backups |
| **This repo** | config-only snapshot, readable, diffable history | `config/` |

The repo is *not* a restore source — secrets are stripped. Restore from the HA backups.

Save the backup encryption key from Settings → System → Backups in a password manager;
without it an encrypted backup can't be restored, and it is deliberately not in this repo.

## Usage

```sh
node login.mjs <user> <pass>   # once — writes .ha-token.json (gitignored, doesn't expire)
node sync.mjs                  # backup + snapshot + commit
```

`sync.mjs` asks HA for a config-only backup, downloads the tar to `backups/` (gitignored,
last 5 kept here and on HA), unpacks it into `config/`, and commits any change.
`.storage/*` JSON is reformatted so diffs are readable.

Not committed: `secrets.yaml`, auth/token stores, `.cloud`, `deps`, `tts`, `.storage/backup`.
Keep this repo private anyway — `.storage/core.config_entries` can hold integration credentials.

Nightly snapshot, if wanted:

```sh
echo "30 3 * * * cd $PWD && /usr/bin/env node sync.mjs >> sync.log 2>&1" | crontab -
```
