import { PathReporter } from "io-ts/lib/PathReporter";
import { IMuscleGeneratorResponse, TMuscleGeneratorResponse } from "../../src/types";
import { IDI } from "./di";
import { LlmMuscles } from "./llms/llmMuscles";

export class MuscleGenerator {
  constructor(
    private readonly di: IDI,
    private readonly llm: LlmMuscles
  ) {}

  public async generateMuscles(exercise: string, attempt: number = 0): Promise<IMuscleGeneratorResponse | undefined> {
    let response = "";
    try {
      for await (const event of this.llm.generateMuscles(exercise)) {
        if (event.type === "finish") {
          response = event.data;
        } else if (event.type === "error") {
          this.di.log.log("Error generating muscles:", event.data);
          return undefined;
        }
      }
      response = response.trim().replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*?$/, "$1");
      const json = JSON.parse(response);
      const decoded = TMuscleGeneratorResponse.decode(json);
      if ("left" in decoded) {
        const error = PathReporter.report(decoded);
        this.di.log.log("Failed to decode muscle generator response:", error, "Response was:", response);
        return undefined;
      } else {
        return decoded.right;
      }
    } catch (err) {
      this.di.log.log("Exception during muscle generation:", err);
      if (attempt < 2) {
        this.di.log.log(`Retrying muscle generation (attempt ${attempt + 1})`);
        return this.generateMuscles(exercise, attempt + 1);
      }
      return undefined;
    }
  }
}
