# J.A.R.V.I.S Deployment Guide

## Prerequisites

### Home Machine (The Brain)
- **OS**: Linux (Ubuntu 22.04+) or macOS
- **Node.js**: 22+ (critical: not 20, not 18)
- **RAM**: 8GB+ (for Ollama + Whisper)
- **Storage**: 50GB+ (for models + state)
- **Network**: Stable internet, behind your router

### Other Devices
- **Laptop/Pi**: Linux or macOS
- **Phone/Tablet**: iOS or Android
- **All devices**: Connected to Tailscale mesh

### Software Dependencies

1. **Ollama** (local LLM)
   ```bash
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Pull a model (e.g., mistral, llama2)
   ollama pull mistral
   ```
   Runs on `http://localhost:11434`

2. **Faster-Whisper** (speech-to-text)
   ```bash
   pip install faster-whisper
   
   # Start the Whisper server
   # (You need to create a simple HTTP wrapper or use an existing one)
   ```
   Runs on `http://localhost:8080`

3. **Tailscale** (mesh VPN)
   ```bash
   # Install on all machines
   # macOS
   brew install tailscale
   sudo tailscale up
   
   # Linux
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```
   Note the IP address assigned to the home machine.

## Part 1: Home Machine Setup

### 1.1 Clone & Install

```bash
mkdir -p ~/jarvis && cd ~/jarvis
git clone https://github.com/azhri1990/jarvis-monorepo.git
cd jarvis-monorepo
npm install
npm run bootstrap
```

### 1.2 Build All Packages

```bash
npm run build
```

### 1.3 Create State Directory

```bash
mkdir -p ~/jarvis/state
chmod 700 ~/jarvis/state  # private
```

### 1.4 Generate Shared Secret

```bash
openssl rand -hex 32
# Copy the output, you'll use it on all devices
```

### 1.5 Start the Gateway

```bash
cd ~/jarvis/jarvis-monorepo/packages/gateway

JARVIS_STATE_DIR="$HOME/jarvis/state" \
JARVIS_UPSTREAM="git@github.com:azhri1990/jarvis-monorepo.git" \
JARVIS_REPO="$HOME/jarvis/jarvis-monorepo" \
SHARED_SECRET="YOUR_GENERATED_SECRET" \
WHISPER_URL="http://127.0.0.1:8080" \
OLLAMA_URL="http://127.0.0.1:11434" \
npm run build && node dist/server.js
```

**Expected output:**
```
[JARVIS] Gateway running on http://localhost:8000
[JARVIS] Mesh registry initialized
[JARVIS] Watchdog started
[JARVIS] Waiting for devices...
```

### 1.6 Keep It Running (Systemd)

Create `/etc/systemd/system/jarvis-gateway.service`:

```ini
[Unit]
Description=J.A.R.V.I.S Gateway - The Brain
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/jarvis/jarvis-monorepo/packages/gateway
ExecStart=/usr/bin/node /home/YOUR_USERNAME/jarvis/jarvis-monorepo/packages/gateway/dist/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="JARVIS_STATE_DIR=/home/YOUR_USERNAME/jarvis/state"
Environment="JARVIS_UPSTREAM=git@github.com:azhri1990/jarvis-monorepo.git"
Environment="JARVIS_REPO=/home/YOUR_USERNAME/jarvis/jarvis-monorepo"
Environment="SHARED_SECRET=YOUR_GENERATED_SECRET"
Environment="WHISPER_URL=http://127.0.0.1:8080"
Environment="OLLAMA_URL=http://127.0.0.1:11434"

[Install]
WantedBy=multi-user.target
```

Enable it:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now jarvis-gateway
sudo systemctl status jarvis-gateway
sudo journalctl -u jarvis-gateway -f  # Watch logs
```

## Part 2: Laptop/Pi Setup (Always-Listening)

On each Linux machine (laptop, Pi):

```bash
# From the monorepo
cd packages/gateway/private

sudo bash install-wake-device.sh \
  "my-laptop" \
  "laptop" \
  "http://YOUR_BRAIN_TAILSCALE_IP:8000" \
  "YOUR_SHARED_SECRET"

# Example:
# sudo bash install-wake-device.sh kitchen-pi pi http://100.101.102.103:8000 abc123def456...
```

What this does:
- Installs wake-word detection engine
- Registers the device with the brain
- Sets up heartbeat cron (every 5 min)
- Starts always-listening background service

**Verify:**
```bash
sudo systemctl status jarvis-wake
journalctl -u jarvis-wake -f
```

## Part 3: Mobile Setup

### 3.1 Install Expo App

- iOS: App Store → search "Expo Go"
- Android: Google Play → search "Expo Go"

### 3.2 Run the Mobile App

On your dev machine (where the monorepo is cloned):

```bash
cd apps/mobile
npm install

JARVIS_GATEWAY="http://YOUR_BRAIN_TAILSCALE_IP:8000" \
JARVIS_SECRET="YOUR_SHARED_SECRET" \
JARVIS_DEVICE_ID="my-iphone" \
npx expo start
```

**In the terminal**, you'll see a QR code. On your phone:
1. Open Expo Go app
2. Tap "Scan QR code"
3. Scan the QR from terminal
4. App launches on your phone

### 3.3 Configure Gateway IP

In the app's Settings tab:
- Gateway URL: `http://YOUR_BRAIN_TAILSCALE_IP:8000`
- Shared Secret: `YOUR_SHARED_SECRET`
- Device ID: Give it a name (e.g., "my-iphone")

## Part 4: Verify Everything

### Check Mesh Status

```bash
# From any device:
curl -H "Authorization: Bearer YOUR_SHARED_SECRET" \
  http://YOUR_BRAIN_TAILSCALE_IP:8000/mesh/devices
```

**Expected response:**
```json
{
  "devices": [
    { "id": "my-laptop", "kind": "laptop", "online": true, "lastHeartbeat": "2024-09-03T10:30:00Z" },
    { "id": "kitchen-pi", "kind": "pi", "online": true, "lastHeartbeat": "2024-09-03T10:29:55Z" },
    { "id": "my-iphone", "kind": "mobile", "online": true, "lastHeartbeat": "2024-09-03T10:30:02Z" }
  ]
}
```

### Test Voice Command

**From phone app:**
1. Tap the blue orb (wake word detector)
2. Say: "What's the weather?"
3. Listen for response

**From laptop (if wake installed):**
1. Say: "J.A.R.V.I.S"
2. Wait for acknowledgment ("Yes, sir?")
3. Say: "Turn on the lights"
4. Listen for response

### Check Logs

**Gateway logs:**
```bash
sudo journalctl -u jarvis-gateway -n 50
```

**Wake engine logs (laptop/Pi):**
```bash
journalctl -u jarvis-wake -n 50
```

**Mobile app logs:**
- In Expo terminal, you'll see console output
- Open the app's Dev Menu → View Logs

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "Node version mismatch" | Using Node 20 instead of 22 | `node --version` and upgrade |
| Gateway won't start | Port 8000 already in use | `lsof -i :8000` and kill |
| Devices show as offline | Wake service crashed | `sudo systemctl restart jarvis-wake` |
| "Whisper offline" error | Faster-Whisper not running | Start Whisper server on port 8080 |
| "No mic permission" (mobile) | iOS/Android permission | Go to Settings → App → Microphone → Allow |
| "Tailscale unreachable" | Mesh not connected | Run `sudo tailscale up` again |

## Backup & Recovery

### Backup State

```bash
# Weekly backup
tar -czf ~/jarvis-state-$(date +%Y%m%d).tar.gz ~/jarvis/state/
```

### Restore State

```bash
tar -xzf ~/jarvis-state-YYYYMMDD.tar.gz -C ~/
```

## Security Hardening

1. **Rotate SHARED_SECRET quarterly**
   ```bash
   NEW_SECRET=$(openssl rand -hex 32)
   # Update in systemd service + all devices
   ```

2. **Audit log rotation**
   ```bash
   # In state dir
   find . -name "audit-*.log" -mtime +30 -delete
   ```

3. **Network isolation**
   - Keep brain off public internet
   - Use Tailscale's "Subnet routes" for devices only accessible internally
   - Enable Tailscale ACLs to restrict which devices can talk to the brain

## Production Checklist

- [ ] Node 22 installed and verified
- [ ] Ollama running with at least one model
- [ ] Faster-Whisper running on port 8080
- [ ] Tailscale mesh connected across all devices
- [ ] SHARED_SECRET generated and stored securely
- [ ] State directory created and backed up
- [ ] Gateway systemd service installed and running
- [ ] Wake services installed on all laptops/Pis
- [ ] Mobile app configured with gateway IP
- [ ] Voice command tested end-to-end
- [ ] Logs being written to journal
- [ ] Mesh view shows all devices as online

**You're live! 🚀**
