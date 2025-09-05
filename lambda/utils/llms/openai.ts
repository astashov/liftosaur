import { ILLMProvider } from "./llmTypes";
import { HttpStreaming } from "./httpStreaming";

export class OpenAIProvider implements ILLMProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = "gpt-4o-mini"
  ) {}

  public async *generate(
    systemPrompt: string,
    userInput: string
  ): AsyncGenerator<{ type: "progress" | "result" | "error" | "retry" | "finish"; data: string }, void, unknown> {
    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: userInput,
      },
    ];

    const requestBody = JSON.stringify({
      model: this.model,
      messages,
      temperature: 0.3,
      stream: true,
    });

    yield { type: "progress", data: "Connecting to OpenAI..." };

    try {
      let fullContent = "";

      const stream = HttpStreaming.streamRequest({
        hostname: "api.openai.com",
        path: "/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: requestBody,
      });

      yield { type: "progress", data: "Processing response..." };

      for await (const line of stream) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            break;
          }
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              yield { type: "result", data: content };
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
        yield { type: "error", data: "No content received from OpenAI" };
      }
    } catch (error: unknown) {
      yield { type: "error", data: (error as Error).message || "Failed to connect to OpenAI" };
    }
  }
}
