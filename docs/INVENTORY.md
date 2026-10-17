# Repository inventory

Source: `azhri1990` GitHub account (24 repos at time of writing; names and metadata only, contents not reviewed).
Licenses were not checked. Verify each before reusing code. Integrate via skill adapters, do not copy code in.

| Repo | Lang | Likely role |
| --- | --- | --- |
| JARVIS-gateway, jarvis-gateway-node | TS / JS | Gateway/brain candidates |
| jarvis-mega-repo, jarvis-unified | TS / Shell | Earlier consolidation attempts |
| jarvis-plugins, jarvis-roadmap, jarvis-boot | - | Archived; mine for ideas |
| jarvis-scripts, my-automator, termux-config | Shell | Automation / mobile host setup |
| NAS-ROUTE, ACODE_ROUTE | TS | Routing |
| NAS-SKILLZ, NAS-LAPIS, NAS-EXTRA, NAS-GET | Rust / - | Skills and tooling |
| NAS-HARNESS, NAS-SCRAPLING | TS / Python | Agent harness, scraping |
| PROJECT-NAS, project-genesis | Python | Life/work OS, experiments |
| llama-cpp-config, omniroute-config | - | Local LLM and routing config |
| PocketStrike-AI | JS | Unrelated to Jarvis (review) |

## Target capabilities (first set)
Local LLM with fallback (`@jarvis/llm`), memory (`@jarvis/memory`), consent (`@jarvis/consent`),
orchestration: event bus, skills, memory-aware assistant (`@jarvis/core`).
Later: wake word, STT/TTS, home control, desktop HUD.

## Audit findings

### Gateway candidates (reviewed 2026-10)
Neither repo has a LICENSE file at its root. Treat both as all-rights-reserved until the owner adds one; port ideas, not code.

**JARVIS-gateway** (TypeScript, v0.3.0, zero runtime deps, Node >=18, has tests and DEPLOY.md). **Keep as the reference design.**
`src/` modules worth re-implementing as monorepo packages or skills:
`agents` (multi-agent), `memory` + `chunker` + `rerank` + `recallgate` (retrieval pipeline),
`consent` + `audit` (mirrors `@jarvis/consent`), `wake` (wake detection), `voices`, `vision`,
`alerts`, `watchdog-config` + `supervisor` + `upgrade` (self-healing/updates), `learn` + `advice`
(self-improvement), `devices` + `mesh` (device mesh), `apps`, `skills`, `server` (HTTP adapter).

**jarvis-gateway-node** (JavaScript/Express, README titled "Jarvis-mobile"). **Fold in, then retire.**
Holds mobile-side notes/tasks/memory as JSON in `data/`, plus `server-omniroute.js` which fronts OmniRoute.
Only the data model (notes, tasks, memory) and the OmniRoute entrypoint idea are useful.
**Security:** its README states `node_modules/` (including a populated `omniroute/.env`) was committed and remains in git history.
Rotate any credential that was ever in that repo before reusing anything from it.

### Gaps vs. this monorepo
No gateway/HTTP package, wake word, voice, vision, alerts, watchdog or learning yet (see JARVIS-gateway `src/` list above).

### Routing repos (reviewed 2026-10)
**NAS-ROUTE**: a full copy of upstream OmniRoute (diegosouzapw/OmniRoute, MIT, copyright diegosouzapw; ~358 providers behind one
OpenAI-compatible endpoint with auto-fallback, Next.js, port 20128). It is not your own code, so do not vendor it. Run it as a service.
**omniroute-config**: README only (MIT) listing connected providers (Groq, DeepSeek, NVIDIA NIM, Cloudflare, etc.) and the dashboard URL. No real config.
**ACODE_ROUTE**: not routing code. It is a research notebook (CATALOG.md of ~1,100 collected items, MOBILE-USEFUL.md, research/) for the Android/Termux box.
Useful facts from it: the phone has no GCC or Docker; OmniRoute runs on Node there; combos named `best` (priority failover over working
Copilot models) and `free-all` (failover over DuckDuckGo models, no tool calling) are the dependable entries; Copilot rate-limits per model, so avoid parallel calls.

**Integration decision:** no code needed in `@jarvis/llm`. Its `OpenAICompatibleProvider` already accepts a base URL, so point the cloud
fallback at OmniRoute: `JARVIS_CLOUD_BASE_URL=http://localhost:20128/v1`, `JARVIS_CLOUD_MODEL=best`, `JARVIS_CLOUD_API_KEY=<omniroute key>`.
Local Ollama remains first; OmniRoute handles provider fallback behind the cloud entry.

### Not yet audited
jarvis-mega-repo, jarvis-unified, jarvis-plugins, jarvis-roadmap, jarvis-boot, NAS-SKILLZ, NAS-LAPIS, NAS-GET, NAS-HARNESS, NAS-SCRAPLING, termux-config,
jarvis-scripts, my-automator, llama-cpp-config, PROJECT-NAS, project-genesis.
Also: no repository named Ultron or Iron Man exists under this account.
