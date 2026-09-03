# J.A.R.V.I.S Monorepo

**Unified AI Assistant for your entire estate — mobile, desktop, IoT, and everything in between.**

```
┌─────────────────────────────────────────┐
│      Jarvis Mobile (React Native)       │
│  • Hands-free wake detection            │
│  • Voice commands & speech-to-text       │
│  • Mesh device visualization             │
│  • Consent gate UI                       │
└──────────────┬──────────────────────────┘
               │ Tailscale Mesh (HTTP)
               ↓
┌─────────────────────────────────────────┐
│    JARVIS Gateway (TypeScript/Node)     │
│  • The Brain: routes & executes         │
│  • Multi-agent orchestration            │
│  • Skill plugin system                  │
│  • Memory & state management            │
│  • Audit & watchdog                     │
└──────────────┬──────────────────────────┘
               │
         ┌─────┼─────┐
         ↓     ↓     ↓
      Ollama Whisper Skillz
      (LLM) (STT)  (Plugins)
```

## 📁 Workspace Structure

```
jarvis-monorepo/
├── apps/
│   └── mobile/                    # React Native mobile app (Expo)
│       ├── src/
│       │   ├── screens/          # Home, Mesh, Settings
│       │   ├── components/       # UI components
│       │   ├── services/         # Gateway integration
│       │   ├── hooks/            # Custom React hooks
│       │   └── types/            # TypeScript types
│       └── package.json
│
├── packages/
│   ├── gateway/                  # Brain (HTTP server)
│   │   ├── src/
│   │   │   ├── server.ts        # Express/Fastify server
│   │   │   ├── routes/          # /voice, /devices, /mesh
│   │   │   ├── middleware/      # Auth, logging, watchdog
│   │   │   ├── services/        # Business logic
│   │   │   └── config/          # Env & settings
│   │   └── package.json
│   │
│   ├── orchestrator/             # Multi-agent coordinator
│   │   ├── src/
│   │   │   ├── orchestrator.ts  # Main orchestration loop
│   │   │   ├── agents/          # Different agent types
│   │   │   └── planner.ts       # Task planning
│   │   └── package.json
│   │
│   ├── skillz/                   # Plugin/skill system
│   │   ├── src/
│   │   │   ├── skillLoader.ts   # Load & register skills
│   │   │   ├── skillBase.ts     # Skill interface
│   │   │   └── skills/          # Individual skills
│   │   └── package.json
│   │
│   ├── lapis/                    # Memory & state (DB)
│   │   ├── src/
│   │   │   ├── db.ts            # Storage interface
│   │   │   └── models/          # Data schemas
│   │   └── package.json
│   │
│   ├── route/                    # Routing logic
│   │   ├── src/
│   │   │   ├── router.ts        # Intent → action
│   │   │   └── strategies/      # Routing strategies
│   │   └── package.json
│   │
│   └── types/                    # Shared TypeScript types
│       ├── src/
│       │   ├── api.ts           # API interfaces
│       │   ├── device.ts        # Device types
│       │   ├── skill.ts         # Skill interface
│       │   └── command.ts       # Command/intent types
│       └── package.json
│
├── docs/
│   ├── ARCHITECTURE.md          # System design
│   ├── DEPLOYMENT.md            # Production setup
│   ├── API.md                   # API reference
│   └── SKILLS.md                # Skill development guide
│
├── scripts/
│   ├── setup.sh                 # Initial setup
│   ├── deploy.sh                # Deployment automation
│   └── dev.sh                   # Local dev environment
│
├── package.json                 # Workspace root
├── lerna.json                   # Lerna config
├── tsconfig.json                # Base TypeScript config
├── .prettierrc                  # Code formatting
└── README.md                    # This file
```

## 🚀 Quick Start

### Prerequisites
- Node 22+
- npm or yarn
- Tailscale (for mesh networking)
- Ollama (for local LLM)
- Faster-Whisper (for speech-to-text)

### Installation

```bash
# Clone the monorepo
git clone https://github.com/azhri1990/jarvis-monorepo.git
cd jarvis-monorepo

# Install all dependencies
npm install

# Bootstrap workspace links
npm run bootstrap
```

### Development

**Terminal 1 - Gateway (the brain)**
```bash
npm run dev:gateway
# Runs on http://localhost:8000
```

**Terminal 2 - Mobile app**
```bash
npm run dev:mobile
# Scan QR code with Expo Go app
```

**Terminal 3 - Orchestrator (optional, if standalone)**
```bash
npm run dev:orchestrator
```

### Build for Production

```bash
npm run build
```

## 📦 Packages at a Glance

| Package | Purpose | Tech Stack |
|---------|---------|------------|
| **mobile** | Mobile UI & voice input | React Native, Expo, TypeScript |
| **gateway** | Central brain & router | Node.js, TypeScript, HTTP API |
| **orchestrator** | Multi-agent coordination | TypeScript, LLM integration |
| **skillz** | Plugin system | TypeScript, dynamic loading |
| **lapis** | Memory & persistence | File/DB storage |
| **route** | Intent routing | TypeScript, pattern matching |
| **types** | Shared interfaces | TypeScript |

## 🔌 Integration Points

### Mobile → Gateway
```typescript
// Mobile sends voice command to gateway
POST /voice/process
  { transcript: string, device_id: string }
  → Response: { response: string, audio: Buffer }
```

### Gateway → Orchestrator
```typescript
// Gateway delegates to orchestrator for complex tasks
const result = await orchestrate({
  intent: 'turn off the lights',
  context: { device_id: 'phone', user: 'john' },
  skills: loadedSkills
});
```

### Gateway ↔ Skills
```typescript
// Skills loaded from packages/skillz/skills/
// Called dynamically based on intent
await skill.execute({ args, context, memory });
```

## 🔐 Security

- **Shared Secret Auth**: All device communication uses `SHARED_SECRET` (Bearer token)
- **Mesh Isolation**: Tailscale ensures only your devices can access the brain
- **Consent Gate**: Every action requires explicit approval
- **Memory Encryption**: State directory should be backed up securely

## 📚 Documentation

- [Architecture Deep Dive](./docs/ARCHITECTURE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [API Reference](./docs/API.md)
- [Building Custom Skills](./docs/SKILLS.md)

## 🛠️ Development Workflow

1. **Pick a package** to work on
2. **Make changes** in its `src/` directory
3. **Test locally** with `npm run dev`
4. **Lint & format** with `npm run lint && npm run format`
5. **Build** with `npm run build`
6. **Commit** with clear message

## 🤝 Contributing

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines.

## 📝 License

MIT

---

**Ready to talk to your devices? Run `npm run dev` and start building! 🎤**
