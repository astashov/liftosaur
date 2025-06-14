import * as https from "https";
import { ILLMProvider } from "./llmTypes";
import { LlmPrompt } from "./llmPrompt";

export class OpenAIProvider implements ILLMProvider {
  constructor(
    private apiKey: string,
    private model: string = "gpt-4o-mini"
  ) {}

  async *convertProgramToLiftoscriptStream(
    input: string
  ): AsyncGenerator<{ type: "progress" | "result" | "error" | "retry" | "finish"; data: string }, void, unknown> {
    const systemPrompt = LlmPrompt.getSystemPrompt();

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: LlmPrompt.getUserPrompt(input),
      },
    ];

    const requestBody = JSON.stringify({
      model: this.model,
      messages,
      temperature: 0.3,
      stream: true,
    });

    yield { type: "progress", data: "Connecting to OpenAI..." };

    const response = await new Promise<any>((resolve, reject) => {
      const req = https.request(
        {
          hostname: "api.openai.com",
          path: "/v1/chat/completions",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
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
      throw new Error(`OpenAI API error: ${response.statusCode} - ${errorBody}`);
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
    }

    if (fullContent) {
      fullContent = fullContent.trim().replace(/^`+/, "").replace(/`+$/, "").trim();
      yield { type: "finish", data: fullContent };
    } else {
      yield { type: "error", data: "No content received from OpenAI" };
    }
  }
}
