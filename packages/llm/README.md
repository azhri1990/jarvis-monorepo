# @jarvis/llm

Provider-agnostic LLM layer. Default is **$0 and credential-free**: local Ollama
(`ollama pull llama3.2`). Set `JARVIS_CLOUD_API_KEY` (optionally
`JARVIS_CLOUD_MODEL`, `JARVIS_CLOUD_BASE_URL`) to add an opt-in cloud fallback.
