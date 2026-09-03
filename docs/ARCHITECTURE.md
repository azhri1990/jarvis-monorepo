# J.A.R.V.I.S Architecture

## System Overview

J.A.R.V.I.S is a **distributed voice AI system** where:

- **One brain** (gateway on home machine) coordinates everything
- **Multiple devices** (phone, laptop, Pi) are hands-free clients
- **Skills/plugins** extend functionality dynamically
- **Memory layer** (Lapis) persists learned context
- **Orchestrator** coordinates complex multi-step tasks

## Data Flow

### 1. Voice Command Flow
```
User speaks → Mobile device listens (always-on wake word)
  ↓
Audio captured → Sent to gateway
  ↓
Gateway: /voice/process endpoint
  ↓
Whisper (STT) → Transcription
  ↓
Router → Determine intent (which skill?)
  ↓
Orchestrator → Multi-agent reasoning
  ↓
Skills → Execute (smart home, web search, etc.)
  ↓
Lapis → Remember result & context
  ↓
Ollama → Generate natural response
  ↓
Text-to-speech → Audio response
  ↓
Response sent back to mobile → Speaker output
```

## Component Interactions

### Gateway (The Brain)
- **Port**: 8000
- **Auth**: Bearer token (SHARED_SECRET)
- **Endpoints**:
  - `POST /voice/process` - Main voice command endpoint
  - `POST /devices/heartbeat` - Device keepalive
  - `GET /mesh/devices` - List connected devices
  - `GET /device/:id/status` - Device status
  - `POST /execute` - Raw command execution

### Orchestrator
- Receives intent from gateway
- Breaks down complex tasks into sub-tasks
- Coordinates multiple agents (each with different capabilities)
- Returns execution plan & results
- Example: "Play my morning playlist" → orchestrator identifies: 1) get user schedule, 2) get playlist, 3) send to speaker

### Skills (Plugins)
- Registered in `packages/skillz/skills/`
- Each skill implements:
  - `canHandle(intent)` - Does this skill match the intent?
  - `execute(args, context)` - Run the skill
  - `schema` - Input/output types
- Examples:
  - `weather.ts` - Weather queries
  - `music.ts` - Music playback
  - `lights.ts` - Smart home control
  - `web.ts` - Web search & retrieval

### Lapis (Memory)
- Persists to `$JARVIS_STATE_DIR` (e.g., `~/jarvis/state/`)
- Stores:
  - Session history
  - User preferences
  - Device registry
  - Audit trail
- Survives reboots (critical for learning)

### Route (Intent Router)
- Pattern matches transcription to:
  - Skill plugins
  - Direct API calls
  - Device commands
- Example patterns:
  - "turn on the lights" → `skills.lights.execute({ action: 'on' })`
  - "what's the weather" → `skills.weather.execute({})`

## Concurrency & Watchdog

Gateway runs a **watchdog** that ensures:
- All child services stay alive (restarts if they crash)
- Managed services:
  - Audit loop (periodic compliance check)
  - Wake engine (on each laptop/Pi)
  - Vision engine (camera monitoring)
  - Device registry (mesh state)

## Security Model

```
┌──────────────────────────────────────────┐
│         Tailscale Mesh (private)         │
│  Only your devices can connect            │
└────────────┬─────────────────────────────┘
             │
      ┌──────┴──────┐
      ↓             ↓
    Device       Gateway
  (Bearer: XXX) (Bearer: XXX)
      │             │
      └──── Auth ───┘
           (SHARED_SECRET)
```

- **Network**: Tailscale ensures mesh isolation
- **Auth**: SHARED_SECRET acts as API key
- **Consent**: Every action goes through consent gate
  - High-risk actions (device power, execute) require approval
  - User approves from any device on mesh

## Example: "Dim the lights to 50%"

1. **Mobile** captures voice → "dim the lights to 50%"
2. **Mobile** sends to gateway:
   ```
   POST /voice/process
   Bearer: SHARED_SECRET
   { transcript: "dim the lights to 50%" }
   ```
3. **Gateway** receives:
   - Runs Whisper (STT already done by mobile, but gateway can re-do)
   - Loads intent router
4. **Router** matches → `skills.lights` (because "dim" + "lights")
5. **Orchestrator** (if complex) breaks down:
   - Extract brightness level (50%)
   - Determine which lights (all? which room?)
   - Create execution plan
6. **Skills.lights** executes:
   - Queries Lapis for current state
   - Sends commands to smart home hub
   - Updates Lapis with new state
7. **Response** generated:
   - Ollama creates natural response: "Dimming all lights to 50%"
   - Text-to-speech converts to audio
   - Sent back to mobile
8. **Mobile** plays audio + vibration feedback
9. **Audit** logs:
   - Who, what, when, where, result
   - Stored in Lapis for compliance

## Scaling Considerations

### Adding New Devices
1. Run `install-wake-device.sh` on the new device (laptop/Pi)
2. Device registers itself with gateway
3. Appears in mesh view immediately

### Adding New Skills
1. Create `packages/skillz/skills/my-skill.ts`
2. Implement skill interface
3. Gateway auto-discovers on startup
4. Ready to use

### Load Balancing
- **Single gateway** handles most home setups (5-10 concurrent connections)
- **Multiple agents** within orchestrator can run in parallel
- **Skills** are async, so multiple skills can execute simultaneously
- For large deployments: add Redis for shared state (future)

## Fault Tolerance

- **Watchdog restarts crashed services**
- **Heartbeat keeps device registry fresh**
- **Lapis persists state** so no data loss on reboot
- **Consent gate prevents accidental actions** during failures
- **Audit trail** lets you review what happened

## Future Extensions

- **Multi-brain setup**: Secondary gateway takes over if primary fails
- **Skill versioning**: Run multiple skill versions, roll back if needed
- **Advanced NLP**: Plug in better models than Ollama
- **Mobile-first skills**: Some skills run entirely on mobile (lighter load)
- **Cloud fallback**: If local Ollama is slow, use cloud LLM
