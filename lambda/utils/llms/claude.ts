import { ILLMProvider } from "./llmTypes";
import { HttpStreaming } from "./httpStreaming";

export class ClaudeProvider implements ILLMProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = "claude-sonnet-4-20250514"
  ) {}

  public async *generate(
    systemPrompt: string,
    userInput: string,
    temperature: number = 0.2
  ): AsyncGenerator<{ type: "progress" | "result" | "error" | "retry" | "finish"; data: string }, void, unknown> {
    const requestBody = JSON.stringify({
      model: this.model,
      temperature: temperature,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral", ttl: "1h" },
        },
      ],
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: userInput,
        },
      ],
      stream: true,
    });

    yield { type: "progress", data: "Connecting to Claude..." };

    try {
      let fullContent = "";

      const stream = HttpStreaming.streamRequest({
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "prompt-caching-2024-07-31,extended-cache-ttl-2025-04-11",
        },
        body: requestBody,
      });

      yield { type: "progress", data: "Processing response..." };

      for await (const line of stream) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          try {
            const json = JSON.parse(data);

            if (json.type === "content_block_delta") {
              const content = json.delta?.text;
              if (content) {
                fullContent += content;
                yield { type: "result", data: content };
              }
            } else if (json.type === "message_stop") {
              break;
            } else if (json.type === "error") {
              yield { type: "error", data: json.error?.message || "Unknown Claude error" };
              return;
            }
          } catch (e) {
            console.error("Failed to parse streaming response:", e);
          }
        }
      }

      if (fullContent) {
        fullContent = fullContent.trim().replace(/^`+/, "").replace(/`+$/, "");
        yield { type: "finish", data: fullContent };
      } else {
        yield { type: "error", data: "No content received from Claude" };
      }
    } catch (error: unknown) {
      yield { type: "error", data: (error as Error).message || "Failed to connect to Claude" };
    }
  }
}
