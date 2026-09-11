# Home Assistant MCP Setup for OMO (Oh My OpenCode)

## ✅ Installed
- `hass-mcp` v0.1.7 - MCP server for Home Assistant control
- Configuration added to `~/.config/opencode/opencode.jsonc`

## 🔑 Step 1: Create Long-Lived Access Token

The HA security page should be open in your browser. If not, go to:
**http://192.168.20.30:8123/profile/security**

1. Scroll down to **"Long-Lived Access Tokens"**
2. Click **"Create Token"**
3. Name it: `MCP Server`
4. **Copy the token** (you'll only see it once!)

## 📝 Step 2: Add Token to OMO Configuration

I've already added the MCP server config to `~/.config/opencode/opencode.jsonc`.

Now you need to:

1. Open the config file:
   ```bash
   code ~/.config/opencode/opencode.jsonc
   ```

2. Find the `homeassistant` section (around line 63)

3. Replace `PASTE_YOUR_LONG_LIVED_TOKEN_HERE` with your actual token

4. Change `"enabled": false` to `"enabled": true`

The config should look like:
```json
"homeassistant": {
  "type": "local",
  "command": ["hass-mcp"],
  "environment": {
    "HASS_URL": "http://192.168.20.30:8123",
    "HASS_TOKEN": "eyJhbGc..."  ← your actual token
  },
  "enabled": true
}
```

## 🔄 Step 3: Restart OMO

After saving the config, restart your OMO session for the MCP server to load.

## 🎯 What You'll Be Able to Do

Once enabled, I can:
- ✅ **Upload scripts.yaml directly** to HA (no manual copying!)
- ✅ **Call HA services** (trigger scripts, control devices)
- ✅ **Read entity states** (check phone status, sensors)
- ✅ **Manage automations and configurations**

## 🧪 Quick Test

After restart, try asking:
```
"Upload the scripts.yaml to Home Assistant"
```

The MCP server will handle it directly! 🏠
