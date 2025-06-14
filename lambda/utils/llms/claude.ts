import * as https from "https";
import { ILLMProvider } from "./llmTypes";
import { LlmPrompt } from "./llmPrompt";

export class ClaudeProvider implements ILLMProvider {
  constructor(
    private apiKey: string,
    private model: string = "claude-sonnet-4-20250514"
  ) {}

  async *convertProgramToLiftoscriptStream(
    input: string
  ): AsyncGenerator<{ type: "progress" | "result" | "error" | "retry" | "finish"; data: string }, void, unknown> {
    const systemPrompt = LlmPrompt.getSystemPrompt();

    const requestBody = JSON.stringify({
      model: this.model,
      temperature: 0.2,
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
          content: LlmPrompt.getUserPrompt(input),
        },
      ],
      stream: true,
    });

    yield { type: "progress", data: "Connecting to Claude..." };

    const response = await new Promise<any>((resolve, reject) => {
      const req = https.request(
        {
          hostname: "api.anthropic.com",
          path: "/v1/messages",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "prompt-caching-2024-07-31,extended-cache-ttl-2025-04-11",
            "Content-Length": Buffer.byteLength(requestBody),
          },
        },
        (res) => {
          resolve(res);
        }
      );

      req.on("error", reject);
      req.write(requestBody);
      req.end();
    });

    if (response.statusCode !== 200) {
      const errorBody = await new Promise<string>((resolve) => {
        let data = "";
        response.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });
        response.on("end", () => resolve(data));
      });
      throw new Error(`Claude API error: ${response.statusCode} - ${errorBody}`);
    }

    yield { type: "progress", data: "Processing response..." };

    // Parse streaming response
    let buffer = "";
    let fullContent = "";

    for await (const chunk of response) {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim() === "") continue;
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
    }

    if (fullContent) {
      fullContent = fullContent.trim().replace(/^`+/, "").replace(/`+$/, "").trim();
      yield { type: "finish", data: fullContent };
    } else {
      yield { type: "error", data: "No content received from Claude" };
    }
  }
}
