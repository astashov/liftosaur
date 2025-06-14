export interface ILLMProvider {
  generateLiftoscript(
    input: string
  ): AsyncGenerator<{ type: "progress" | "result" | "error" | "retry" | "finish"; data: string }, void, unknown>;
}

export interface ILLMConfig {
  provider: "openai" | "anthropic";
  apiKey: string;
  model?: string;
}
