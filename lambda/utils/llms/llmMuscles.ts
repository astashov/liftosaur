import { ILLMProvider } from "./llmTypes";
import { IDI } from "../di";
import { availableMuscles, exerciseKinds } from "../../../src/types";

export class LlmMuscles {
  constructor(
    private readonly di: IDI,
    private readonly provider: ILLMProvider
  ) {}

  public async *generateMuscles(
    exercise: string
  ): AsyncGenerator<{ type: "progress" | "result" | "error" | "retry" | "finish"; data: string }, void, unknown> {
    try {
      for await (const event of this.provider.generate(
        LlmMuscles.getSystemPrompt(),
        LlmMuscles.getUserPrompt(exercise),
        0
      )) {
        yield event;
      }
    } catch (err) {
      this.di.log.log("Error in streaming conversion:", err);
      yield { type: "error", data: err instanceof Error ? err.message : "Unknown error" };
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
