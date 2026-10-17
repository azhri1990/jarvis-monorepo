export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMProvider {
  readonly name: string;
  chat(messages: ChatMessage[], signal?: AbortSignal): Promise<string>;
}
