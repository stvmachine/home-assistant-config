# Find My Phone Setup

## ✅ Scripts Created

The following scripts have been added to `config/scripts.yaml`:

- **`find_dada_phone`** - Ready to use for Dada's phone
- **`find_wife_phone`** - Template ready (commented out until wife's phone is added)

## 📱 Adding Your Wife's Phone to Home Assistant

1. Install the **Home Assistant Companion** app on her phone from:
   - Android: [Google Play Store](https://play.google.com/store/apps/details?id=io.homeassistant.companion.android)
   - iOS: [App Store](https://apps.apple.com/app/home-assistant/id1099568401)

2. Open the app and connect to your Home Assistant instance (`192.168.20.30:8123`)

3. Once connected, check the entity name in Developer Tools → States (look for entities starting with `sensor.*_ringer_mode`)

4. Update the commented script in `config/scripts.yaml`:
   - Replace `WIFE_PHONE` with the actual entity name (e.g., `mom_phone`, `pixel_7`, etc.)
   - Uncomment the script

## 🎛️ Adding Buttons to Your Dashboard

### Option 1: Quick Add via UI (Easiest)

1. Go to your Home Assistant dashboard
2. Click **Edit Dashboard** (top right)
3. Click **+ Add Card**
4. Search for **"Button"** card
5. Configure:
   - **Entity**: `script.find_dada_phone`
   - **Name**: Find Dada Phone
   - **Icon**: `mdi:phone-ring`
   - **Tap Action**: Call service → `script.turn_on` → `script.find_dada_phone`
6. Click **Save**
7. Repeat for wife's phone (once configured)

### Option 2: Add a Grid Card with Both Buttons

1. Click **+ Add Card** → **Grid Card**
2. Add two Button cards inside it:

```yaml
type: grid
cards:
  - type: button
    tap_action:
      action: call-service
      service: script.turn_on
      target:
        entity_id: script.find_dada_phone
    name: Find Dada Phone
    icon: mdi:phone-ring
    show_state: false
  - type: button
    tap_action:
      action: call-service
      service: script.turn_on
      target:
        entity_id: script.find_wife_phone
    name: Find Wife Phone
    icon: mdi:phone-ring
    show_state: false
columns: 2
square: false
```

### Option 3: Manual YAML Configuration

If you prefer editing YAML directly, add this to a view in `.storage/lovelace`:

```yaml
- type: horizontal-stack
  cards:
    - type: button
      tap_action:
        action: call-service
        service: script.turn_on
        target:
          entity_id: script.find_dada_phone
      name: Find Dada Phone
      icon: mdi:phone-ring
      show_state: false
    - type: button
      tap_action:
        action: call-service
        service: script.turn_on
        target:
          entity_id: script.find_wife_phone
      name: Find Wife Phone
      icon: mdi:phone-ring
      show_state: false
```

## 🔧 How It Works

When you tap the button:

1. **Saves current ringer mode** - Preserves the phone's current sound setting
2. **Sets ringer to normal** - Ensures the phone can make sound
3. **Sends high-priority notification** - Triggers an alarm sound through the `alarm_stream` channel
4. **Waits 2 seconds** - Gives time for the notification to be heard
5. **Restores original ringer mode** - Returns the phone to its previous state (silent/vibrate/normal)

## 🎯 Testing

After adding the button to your dashboard:

1. Make sure the Home Assistant Companion app is running on the phone
2. Tap the "Find Dada Phone" button
3. The phone should ring loudly even if it's on silent mode
4. After 2 seconds, it will return to its original ringer mode

## 🔍 Troubleshooting

- **Button doesn't appear**: Reload Home Assistant or restart
- **Phone doesn't ring**: Check that the Home Assistant Companion app has notification permissions
- **Script fails**: Check Developer Tools → Services → `notify.mobile_app_dada_phone` is available
- **Ringer mode not restored**: The `sensor.dada_phone_ringer_mode` entity might not be available (requires recent version of HA Companion app)

## 📝 Next Steps

1. Test the Dada phone button
2. Add wife's phone to HA
3. Update and uncomment the `find_wife_phone` script
4. Add both buttons to your favorite dashboard view
5. Run `node sync.mjs -m "feat(scripts): add find phone scripts"` to commit the changes
