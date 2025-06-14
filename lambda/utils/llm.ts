import { ISecretsUtil } from "./secrets";
import { ILogUtil } from "./log";
import { PlannerProgram } from "../../src/pages/planner/models/plannerProgram";
import { Settings } from "../../src/models/settings";
import { PlannerSyntaxError } from "../../src/pages/planner/plannerExerciseEvaluator";

export interface ILlmUtil {
  convertProgramToLiftoscript(input: string): Promise<string>;
}

interface IFetchedContent {
  content: string;
  type: "text" | "csv" | "html" | "json";
}

interface IValidationResult {
  isValid: boolean;
  errors?: PlannerSyntaxError[];
}

export class LlmUtil implements ILlmUtil {
  constructor(
    private readonly secrets: ISecretsUtil,
    private readonly log: ILogUtil,
    private readonly fetch: Window["fetch"]
  ) {}

  private isUrl(input: string): boolean {
    try {
      const url = new URL(input.trim());
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  private async fetchUrlContent(url: string): Promise<IFetchedContent> {
    try {
      // Handle Google Sheets specially
      if (url.includes("docs.google.com/spreadsheets")) {
        return await this.fetchGoogleSheet(url);
      }

      // Fetch generic URL
      const response = await this.fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();

      let type: IFetchedContent["type"] = "text";
      if (contentType.includes("json")) {
        type = "json";
      } else if (contentType.includes("html")) {
        type = "html";
      } else if (contentType.includes("csv")) {
        type = "csv";
      }

      return { content: text, type };
    } catch (error) {
      this.log.log("Error fetching URL:", error);
      throw new Error(`Failed to fetch content from URL: ${error}`);
    }
  }

  private async fetchGoogleSheet(url: string): Promise<IFetchedContent> {
    // Extract sheet ID and GID from URL
    const sheetIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = url.match(/[#&]gid=([0-9]+)/);

    if (!sheetIdMatch) {
      throw new Error("Invalid Google Sheets URL");
    }

    const sheetId = sheetIdMatch[1];
    const gid = gidMatch ? gidMatch[1] : "0";

    // Convert to CSV export URL
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

    const response = await this.fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheet: ${response.status}`);
    }

    const csvContent = await response.text();
    return { content: csvContent, type: "csv" };
  }

  private validateLiftoscript(liftoscript: string): IValidationResult {
    const settings = Settings.build();
    const { evaluatedWeeks } = PlannerProgram.evaluateFull(liftoscript, settings);

    if (!evaluatedWeeks.success) {
      return {
        isValid: false,
        errors: [evaluatedWeeks.error],
      };
    }

    return { isValid: true };
  }

  public async convertProgramToLiftoscript(input: string, maxAttempts: number = 3): Promise<string> {
    const apiKey = await this.secrets.getOpenAiKey();

    // Check if input is a URL and fetch content
    let programContent = input;
    let contentType = "text";

    if (this.isUrl(input)) {
      const fetched = await this.fetchUrlContent(input);
      programContent = fetched.content;
      contentType = fetched.type;

      // Add context about the content type
      if (contentType === "csv") {
        programContent = `[This is CSV data from a spreadsheet]:\n\n${programContent}`;
      } else if (contentType === "html") {
        programContent = `[This is HTML content, extract the workout program information]:\n\n${programContent}`;
      }
    }

    // Attempt conversion with validation and refinement
    let errors: PlannerSyntaxError[] = [];

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const systemPrompt = `You are an expert at converting workout programs to Liftoscript format.

Liftoscript is a domain-specific language for defining workout programs with these key features:
- Programs are organized into weeks (# Week 1) and days (## Day 1)
- Each exercise line format: ExerciseName / sets x reps / weight [/ optional properties]
- Weight can be absolute (135lb, 60kg) or percentage (80%)
- State variables for tracking: state.weight, state.reps, etc.
- Built-in progression functions: lp() for linear progression, dp() for double progression

Syntax rules:
- Week headers: # Week 1
- Day headers: ## Day 1  
- Exercise format: Exercise Name / 3x5 / 135lb
- With progression: Squat / 3x5 / 135lb / progress: lp(5lb)
- Percentages: Bench Press / 5x5 / 80%
- Rep ranges: Pull Up / 3x8-12 / bodyweight

Example program:
# Week 1
## Day 1: Push
Bench Press / 5x5 / 80% / progress: lp(5lb)
Overhead Press / 3x8 / 60lb
Dips / 3x10-15 / bodyweight

## Day 2: Pull
Deadlift / 1x5 / 225lb / progress: lp(10lb)
Barbell Row / 3x8 / 135lb
Pull Up / 3x6-10 / bodyweight

${errors.length > 0 ? `\nIMPORTANT: The previous attempt had these errors: ${errors.map((e) => e.message).join("; ")}\nPlease fix that.` : ""}

Return ONLY the Liftoscript code, no explanations or comments.`;

      const userPrompt = `Convert the following workout program to Liftoscript format:\n\n${programContent}`;

      try {
        // Start with GPT-4o Mini for cost efficiency
        const response = await this.fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 4000,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          this.log.log("OpenAI API error:", response.status, error);
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const liftoscript = data.choices[0]?.message?.content || "";

        if (!liftoscript) {
          throw new Error("Empty response from OpenAI");
        }

        const trimmedLiftoscript = liftoscript.trim();
        this.log.log("Generated Liftoscript:", trimmedLiftoscript);

        // Validate the generated Liftoscript
        const validation = this.validateLiftoscript(trimmedLiftoscript);

        if (validation.isValid) {
          this.log.log(`Successfully converted program on attempt ${attempt + 1}`);
          return trimmedLiftoscript;
        }

        // If not valid, store the error for next attempt
        errors = errors.concat(validation.errors || []);
        this.log.log(`Validation failed on attempt ${attempt + 1}: ${errors}`);

        // If this is the last attempt, throw the error
        if (attempt === maxAttempts - 1) {
          throw new Error(
            `Failed to generate valid Liftoscript after ${maxAttempts} attempts. Last error: ${errors.map((e) => e.message).join("; ")}`
          );
        }
      } catch (error) {
        this.log.log("Error in conversion attempt:", error);

        throw error;
      }
    }

    throw new Error("Failed to convert program to Liftoscript");
  }
}
