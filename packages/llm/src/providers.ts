import { ChatMessage, LLMProvider } from './types';

type Fetch = typeof fetch;

async function postJson(f: Fetch, url: string, body: unknown, headers: Record<string, string>, signal?: AbortSignal): Promise<any> {
  const res = await f(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

/** Local Ollama server (default http://localhost:11434). */
export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';
  constructor(private model: string, private baseUrl = 'http://localhost:11434', private f: Fetch = fetch) {}
  async chat(messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
    const data = await postJson(this.f, `${this.baseUrl}/api/chat`, { model: this.model, messages, stream: false }, {}, signal);
    const text = data?.message?.content;
    if (typeof text !== 'string') throw new Error('Malformed Ollama response');
    return text;
  }
}

/** Any OpenAI-compatible chat completions endpoint (cloud or self-hosted). */
export class OpenAICompatibleProvider implements LLMProvider {
  constructor(
    readonly name: string,
    private model: string,
    private apiKey: string,
    private baseUrl = 'https://api.openai.com/v1',
    private f: Fetch = fetch
  ) {}
  async chat(messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
    const headers = { authorization: 'Bearer ' + this.apiKey };
    const data = await postJson(this.f, `${this.baseUrl}/chat/completions`, { model: this.model, messages }, headers, signal);
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string') throw new Error(`Malformed response from ${this.name}`);
    return text;
  }
}
