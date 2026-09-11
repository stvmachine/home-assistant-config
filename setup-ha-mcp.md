# Home Assistant MCP Setup

## ✅ Installed
- `hass-mcp` v0.1.7 - MCP server for Home Assistant control

## 🔑 Step 1: Create Long-Lived Access Token

1. Go to http://192.168.20.30:8123/profile/security
2. Scroll down to **"Long-Lived Access Tokens"**
3. Click **"Create Token"**
4. Name it: `MCP Server`
5. Copy the token (you'll only see it once!)

## 📝 Step 2: Configure MCP Server for Claude Code

Create or edit your Claude Code MCP configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "homeassistant": {
      "command": "hass-mcp",
      "env": {
        "HASS_URL": "http://192.168.20.30:8123",
        "HASS_TOKEN": "YOUR_LONG_LIVED_TOKEN_HERE"
      }
    }
  }
}
```

Replace `YOUR_LONG_LIVED_TOKEN_HERE` with the token from Step 1.

## 🔄 Step 3: Restart Claude Code

After saving the config, restart Claude Code for the MCP server to load.

## 🎯 What You'll Be Able to Do

Once configured, you can:
- **Update scripts.yaml directly** via MCP commands
- **Call Home Assistant services** (turn on/off lights, trigger scripts, etc.)
- **Read entity states** (check if phone is home, get sensor values)
- **Trigger automations**
- **Update configurations** without manual file copying

## 🧪 Test It

After restart, try asking:
- "Upload the scripts.yaml to Home Assistant"
- "What's the state of sensor.dada_phone_ringer_mode?"
- "Turn on script.find_dada_phone"

The MCP server provides direct Home Assistant control! 🏠
