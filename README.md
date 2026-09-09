# Home Assistant config

Snapshot of the HA instance at `192.168.20.30:8123` (HA OS 2025.7.4, Melbourne), tracked in git.

## Backups vs this repo — two different things

| | what | where |
|---|---|---|
| **Restore backups** | full backup (config + database + add-ons), encrypted, daily 04:30, keeps 5 | on the HA box, Settings → System → Backups |
| **This repo** | config-only snapshot, readable, diffable history | `config/` |

The repo is *not* a restore source — secrets are stripped. Restore from the HA backups.

Save the backup encryption key from Settings → System → Backups in a password manager.
Without it an encrypted backup can't be restored, and it is deliberately not in this repo.

## Usage

```sh
node login.mjs <user> <pass>            # once — writes .ha-token.json (gitignored, doesn't expire)
node sync.mjs                           # backup + snapshot + commit
node sync.mjs -m "feat(automations): ..."   # say what changed
node sync.mjs --no-commit               # snapshot only
```

`sync.mjs` asks HA for a config-only backup, downloads the tar to `backups/` (gitignored,
last 5 kept here and on HA), unpacks it into `config/`, and commits any change.
`.storage/*` JSON is reformatted so diffs are readable.

Commits are conventional. Without `-m` the scope is inferred from the staged paths
(`automations`, `scripts`, `lovelace`, `integrations`, else `config`) and the type is always
`chore` — a sync script can't tell a new integration from a registry timestamp shuffle.

Nightly snapshot, if wanted:

```sh
echo "30 3 * * * cd $PWD && /usr/bin/env node sync.mjs >> sync.log 2>&1" | crontab -
```

## What's not committed

`secrets.yaml`, auth/token stores, `.cloud`, `deps`, `tts`, `.storage/backup`, and anything
matching `.storage/*.{pem,key,crt,p12}` — integrations drop client certs and pairing keys there
(the Android TV Remote pairing key, for one).

Keep this repo private anyway: `.storage/core.config_entries` can hold integration credentials.

## The living room TV

Two entities point at the same Sony BRAVIA, and the difference matters:

- `media_player.living_room_tv` — Cast. Fine for casting, but launching a **YouTube video**
  on it goes through YouTube's lounge pairing API, which needs a screen id the app only
  publishes once it has settled. From a cold TV it fails (`400 screen_ids parameter error`),
  and each failure drops the cast socket, so retrying makes it worse, not better.
- `media_player.living_room_tv_atv` — Android TV Remote. Sends the TV an intent deep link.
  No cast session, no lounge API. Cold TV to playing video: **8 seconds, first try.**

Use the `_atv` one for anything that opens an app. That's what `TV YouTube wake` does —
turn on, wait 5s, `play_media` with `media_content_type: url` and a `youtube.com/watch?v=…`
URL, daily at 06:00.

Re-pairing (if the TV forgets HA): Settings → Devices → Add → Android TV Remote → the TV
shows a 6-digit code.
