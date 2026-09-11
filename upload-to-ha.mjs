#!/usr/bin/env node
// Upload scripts.yaml to Home Assistant via REST API
import fs from "node:fs";

const HOST = process.env.HA_HOST || "192.168.20.30:8123";
const REPO = import.meta.dirname;
const AUTH = `${REPO}/.ha-token.json`;

async function accessToken() {
	const { access_token } = JSON.parse(await fs.promises.readFile(AUTH, "utf8"));
	return access_token;
}

async function uploadFile(filename, content) {
	const token = await accessToken();
	const url = `http://${HOST}/api/config/script/config`;
	
	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ config: content }),
	});

	if (!response.ok) {
		// Try alternative method: use file editor service if available
		console.log("Direct upload not supported. Trying configuration reload...");
		
		// Call the script reload service
		const reloadUrl = `http://${HOST}/api/services/script/reload`;
		const reloadResp = await fetch(reloadUrl, {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${token}`,
				"Content-Type": "application/json",
			},
		});
		
		if (reloadResp.ok) {
			console.log("✅ Script reload triggered. Files must be manually copied.");
			console.log("\n📋 Manual steps needed:");
			console.log("1. Go to http://192.168.20.30:8123/");
			console.log("2. Install 'File Editor' add-on if not already installed");
			console.log("3. Open File Editor → config/scripts.yaml");
			console.log("4. Replace content with the local file");
			console.log("5. Save and reload scripts");
			return false;
		}
	}
	
	return response.ok;
}

async function main() {
	const scriptsYaml = await fs.promises.readFile(`${REPO}/config/scripts.yaml`, "utf8");
	
	console.log("📤 Attempting to upload scripts.yaml to Home Assistant...\n");
	
	const success = await uploadFile("scripts.yaml", scriptsYaml);
	
	if (success) {
		console.log("✅ Scripts uploaded successfully!");
		console.log("🔄 Reloading script configuration...");
		
		const token = await accessToken();
		const reloadUrl = `http://${HOST}/api/services/script/reload`;
		const reloadResp = await fetch(reloadUrl, {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${token}`,
				"Content-Type": "application/json",
			},
		});
		
		if (reloadResp.ok) {
			console.log("✅ Scripts reloaded! The 'Find My Phone' scripts are now available.");
		}
	} else {
		console.log("\n⚠️  Automatic upload not available.");
		console.log("Please copy config/scripts.yaml manually via File Editor add-on.");
	}
}

main().catch(console.error);
