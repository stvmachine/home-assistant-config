#!/usr/bin/env node
// Snapshot Home Assistant config into this repo. No deps, node 22+.
// Usage: node sync.mjs [--no-commit]
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const HOST = process.env.HA_HOST || "192.168.20.30:8123";
const KEEP = 5; // backups kept locally and on HA
const REPO = import.meta.dirname;
const AUTH = `${REPO}/.ha-token.json`;
// Never committed: credentials, caches, runtime state.
const EXCLUDE = [
	"secrets.yaml",
	".cloud",
	"deps",
	"tts",
	"image",
	"backups",
	".storage/auth",
	".storage/auth_provider.homeassistant",
	".storage/http.auth",
	".storage/application_credentials",
	".storage/cloud",
	".storage/core.restore_state",
	".storage/bluetooth.passive_update_processor",
	".storage/onboarding",
	".storage/backup",
];

const sh = (cmd, args, opts) => execFileSync(cmd, args, { cwd: REPO, ...opts });

async function accessToken() {
	const { refresh_token } = JSON.parse(fs.readFileSync(AUTH, "utf8"));
	const r = await fetch(`http://${HOST}/auth/token`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token,
			client_id: `http://${HOST}/`,
		}),
	});
	if (!r.ok) throw new Error(`token refresh failed (${r.status}) — re-run login.mjs`);
	return (await r.json()).access_token;
}

// One websocket session; send commands, resolve each by id.
function connect(token) {
	const ws = new WebSocket(`ws://${HOST}/api/websocket`);
	let id = 0;
	const waiting = new Map();
	const ready = new Promise((res, rej) => {
		ws.onerror = (e) => rej(new Error(`websocket: ${e.message}`));
		ws.onmessage = (e) => {
			const m = JSON.parse(e.data);
			if (m.type === "auth_required")
				ws.send(JSON.stringify({ type: "auth", access_token: token }));
			else if (m.type === "auth_ok") res();
			else if (m.type === "auth_invalid") rej(new Error("auth rejected"));
			else if (m.type === "result") {
				const { ok, fail } = waiting.get(m.id) || {};
				waiting.delete(m.id);
				m.success ? ok(m.result) : fail(new Error(JSON.stringify(m.error)));
			}
		};
	});
	return {
		ready,
		close: () => ws.close(),
		send: (cmd) =>
			new Promise((ok, fail) => {
				const i = ++id;
				waiting.set(i, { ok, fail });
				ws.send(JSON.stringify({ id: i, ...cmd }));
			}),
	};
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Conventional commit. Pass -m "feat(automations): ..." to say what actually changed;
// otherwise scope is inferred from the staged paths.
function message(when) {
	const m = process.argv.indexOf("-m");
	if (m !== -1 && process.argv[m + 1]) return process.argv[m + 1];
	const files = sh("git", ["diff", "--cached", "--name-only"]).toString().trim().split("\n");
	const hit = (p) => files.some((f) => f.includes(p));
	const scope = hit("automations.yaml")
		? "automations"
		: hit("scripts.yaml") || hit("scenes.yaml")
			? "scripts"
			: hit("lovelace")
				? "lovelace"
				: hit("core.config_entries") || hit("core.device_registry")
					? "integrations"
					: "config";
	return `chore(${scope}): sync HA config ${when}`;
}

async function main() {
	const token = await accessToken();
	const ha = connect(token);
	await ha.ready;

	const before = new Set((await ha.send({ type: "backup/info" })).backups.map((b) => b.backup_id));
	await ha.send({
		type: "backup/generate",
		agent_ids: ["hassio.local"],
		include_addons: [],
		include_all_addons: false,
		include_database: false,
		include_folders: [],
		include_homeassistant: true,
		name: "git-snapshot",
	});

	let backup;
	for (let i = 0; i < 60 && !backup; i++) {
		// config-only backups take seconds
		await sleep(2000);
		const info = await ha.send({ type: "backup/info" });
		if (info.state === "idle") backup = info.backups.find((b) => !before.has(b.backup_id));
	}
	if (!backup) throw new Error("backup did not appear after 2 minutes");
	console.log(`backup ${backup.backup_id} (${backup.agents["hassio.local"].size} bytes)`);

	const tar = `${REPO}/backups/${backup.date.slice(0, 19).replace(/[:T]/g, "-")}-${backup.backup_id}.tar`;
	fs.mkdirSync(`${REPO}/backups`, { recursive: true });
	const dl = await fetch(
		`http://${HOST}/api/backup/download/${backup.backup_id}?agent_id=hassio.local`,
		{ headers: { Authorization: `Bearer ${token}` } },
	);
	if (!dl.ok) throw new Error(`download failed (${dl.status})`);
	fs.writeFileSync(tar, Buffer.from(await dl.arrayBuffer()));

	// Prune old snapshots here and on HA (its own retention only covers automatic backups).
	const mine = (await ha.send({ type: "backup/info" })).backups
		.filter((b) => b.name === "git-snapshot")
		.sort((a, b) => b.date.localeCompare(a.date));
	for (const old of mine.slice(KEEP))
		await ha.send({ type: "backup/delete", backup_id: old.backup_id });
	for (const f of fs
		.readdirSync(`${REPO}/backups`)
		.filter((f) => f.endsWith(".tar"))
		.sort()
		.reverse()
		.slice(KEEP))
		fs.unlinkSync(`${REPO}/backups/${f}`);
	ha.close();

	// Unpack: outer tar -> homeassistant.tar.gz -> data/ == the config dir.
	const tmp = fs.mkdtempSync("/tmp/ha-sync-");
	sh("tar", ["xf", tar, "-C", tmp]);
	fs.rmSync(`${REPO}/config`, { recursive: true, force: true }); // so deletions show up in git
	fs.mkdirSync(`${REPO}/config`);
	sh("tar", [
		"xzf",
		`${tmp}/homeassistant.tar.gz`,
		"-C",
		`${REPO}/config`,
		"--strip-components=1",
		"data",
	]);
	fs.rmSync(tmp, { recursive: true, force: true });
	for (const p of EXCLUDE) fs.rmSync(`${REPO}/config/${p}`, { recursive: true, force: true });
	// Integrations drop key material in .storage (client certs, pairing keys) — never commit it.
	for (const f of fs
		.readdirSync(`${REPO}/config/.storage`)
		.filter((f) => /\.(pem|key|crt|p12)$/.test(f)))
		fs.rmSync(`${REPO}/config/.storage/${f}`);

	// .storage is JSON on one line per record — reformat so diffs are readable.
	for (const f of fs.readdirSync(`${REPO}/config/.storage`)) {
		const p = `${REPO}/config/.storage/${f}`;
		try {
			fs.writeFileSync(p, JSON.stringify(JSON.parse(fs.readFileSync(p, "utf8")), null, 2) + "\n");
		} catch {
			/* not JSON, leave it */
		}
	}

	if (process.argv.includes("--no-commit")) return;
	sh("git", ["add", "-A"]);
	if (sh("git", ["status", "--porcelain"]).length === 0) return console.log("no config changes");
	sh("git", ["commit", "-q", "-m", message(backup.date.slice(0, 16))]);
	console.log(sh("git", ["log", "-1", "--stat", "--oneline"]).toString());
}

main().then(
	() => process.exit(0),
	(e) => {
		console.error(e.message);
		process.exit(1);
	},
);
