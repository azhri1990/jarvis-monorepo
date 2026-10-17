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
