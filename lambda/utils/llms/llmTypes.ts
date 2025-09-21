export interface ILLMProvider {
  generate(
    systemPrompt: string,
    userInput: string,
    temperature?: number
  ): AsyncGenerator<{ type: "progress" | "result" | "error" | "retry" | "finish"; data: string }, void, unknown>;
}

export interface ILLMConfig {
  provider: "openai" | "anthropic";
  apiKey: string;
  model?: string;
}
