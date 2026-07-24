import { ILLMProvider } from "./llmTypes";
import { IDI } from "../di";
import { AiLogsDao } from "../../dao/aiLogsDao";
import { availableMuscles, exerciseKinds } from "../../../src/types";

export class LlmMuscles {
  constructor(
    private readonly di: IDI,
    private readonly provider: ILLMProvider,
    private readonly userId: string
  ) {}

  public async *generateMuscles(
    exercise: string
  ): AsyncGenerator<{ type: "progress" | "result" | "error" | "retry" | "finish"; data: string }, void, unknown> {
    let fullResponse = "";
    let error: string | undefined;

    try {
      for await (const event of this.provider.generate(
        LlmMuscles.getSystemPrompt(),
        LlmMuscles.getUserPrompt(exercise),
        0
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

    await this.logAiInteraction(this.userId, exercise, fullResponse, error);
  }

  private async logAiInteraction(userId: string, exercise: string, response: string, error?: string): Promise<void> {
    try {
      const aiLogsDao = new AiLogsDao(this.di);
      await aiLogsDao.create({
        userId: userId,
        email: undefined,
        input: exercise,
        response,
        timestamp: Date.now(),
        model: this.provider.constructor.name.replace("Provider", ""),
        error,
      });
    } catch (err) {
      this.di.log.log("Failed to log AI interaction:", err);
    }
  }

  public static getSystemPrompt(): string {
    return `Return target and synergist muscles, and the exercise type for given exercise. Use only the muscles and the types from the provided lists.

Available muscles list:

${availableMuscles.map((m) => `* ${m}`).join("\n")}

Available types list:

${exerciseKinds.map((k) => `* ${k}`).join("\n")}

Use ONLY the muscles and the types from the provided lists. If there's no matching muscle, try to find the closest one.
If there's no even closest one, skip it.

Return the result in the following JSON format:

type Response {
  targetMuscles: string[];
  synergistMuscles: string[];
  types: string[];
}

If there's an error, return it in the following JSON format:

type ErrorResponse {
  error: string;
}
`;
  }

  public static getUserPrompt(input: string): string {
    return `Return the target and synergist muscles and exercise types for the following exercise: ${input}`;
  }
}
