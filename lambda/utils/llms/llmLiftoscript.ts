import { ILLMProvider } from "./llmTypes";
import { IAccount } from "../../../src/models/account";
import { IDI } from "../di";
import { AiLogsDao } from "../../dao/aiLogsDao";
import { LlmPrompt_getSystemPrompt, LlmPrompt_getUserPrompt } from "./llmPrompt";

export class LlmLiftoscript {
  constructor(
    private readonly di: IDI,
    private readonly provider: ILLMProvider
  ) {}

  public async *generateLiftoscript(
    programContent: string,
    account: IAccount,
    originalInput?: string
  ): AsyncGenerator<{ type: "progress" | "result" | "error" | "retry" | "finish"; data: string }, void, unknown> {
    let fullResponse = "";
    let error: string | undefined;

    try {
      for await (const event of this.provider.generate(
        LlmPrompt_getSystemPrompt(),
        LlmPrompt_getUserPrompt(programContent)
      )) {
        if (event.type === "result") {
          fullResponse += event.data;
        } else if (event.type === "finish") {
          fullResponse = event.data;
        } else if (event.type === "error") {
          error = event.data;
        }
        yield event;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
      this.di.log.log("Error in streaming conversion:", err);
      yield { type: "error", data: error };
    }

    if (originalInput) {
      await this.logAiInteraction(account, originalInput, fullResponse, error);
    }
  }

  private async logAiInteraction(account: IAccount, input: string, response: string, error?: string): Promise<void> {
    try {
      const aiLogsDao = new AiLogsDao(this.di);
      await aiLogsDao.create({
        userId: account.id,
        email: account.email,
        input,
        response,
        timestamp: Date.now(),
        model: this.provider.constructor.name.replace("Provider", ""),
        error,
      });
    } catch (err) {
      this.di.log.log("Failed to log AI interaction:", err);
    }
  }
}
