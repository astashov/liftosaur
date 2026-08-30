import { ILLMProvider } from "./llmTypes";
import { IDI } from "../di";
import { LlmPrompt_getSystemPrompt, LlmPrompt_getUserPrompt } from "./llmPrompt";

export class LlmLiftoscript {
  constructor(
    private readonly di: IDI,
    private readonly provider: ILLMProvider
  ) {}

  public async *generateLiftoscript(
    programContent: string
  ): AsyncGenerator<{ type: "progress" | "result" | "error" | "retry" | "finish"; data: string }, void, unknown> {
    try {
      for await (const event of this.provider.generate(
        LlmPrompt_getSystemPrompt(),
        LlmPrompt_getUserPrompt(programContent)
      )) {
        yield event;
      }
    } catch (err) {
      this.di.log.log("Error in streaming conversion:", err);
      yield { type: "error", data: err instanceof Error ? err.message : "Unknown error" };
    }
  }
}
