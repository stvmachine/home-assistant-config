#!/usr/bin/env node
// One-off: exchange HA username/password for a refresh token in .ha-token.json
// Usage: node login.mjs <user> <pass>
const HOST = process.env.HA_HOST || '192.168.20.30:8123';
const CID = `http://${HOST}/`;
const [user, pass] = process.argv.slice(2);
if (!pass) { console.error('usage: node login.mjs <user> <pass>'); process.exit(1); }
const post = async (path, body, form) => {
  const r = await fetch(`http://${HOST}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' },
    body: form ? new URLSearchParams(body) : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
};
const flow = await post('/auth/login_flow', { client_id: CID, handler: ['homeassistant', null], redirect_uri: CID });
const step = await post(`/auth/login_flow/${flow.flow_id}`, { username: user, password: pass, client_id: CID });
if (step.type !== 'create_entry') throw new Error(`login failed: ${JSON.stringify(step.errors || step)}`);
const tok = await post('/auth/token', { grant_type: 'authorization_code', code: step.result, client_id: CID }, true);
await import('node:fs').then((fs) => fs.writeFileSync(
  new URL('./.ha-token.json', import.meta.url), JSON.stringify({ refresh_token: tok.refresh_token }, null, 2)));
console.log('wrote .ha-token.json');
