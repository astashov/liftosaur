import { ISecretsUtil } from "./secrets";
import { ILogUtil } from "./log";
import { PlannerProgram } from "../../src/pages/planner/models/plannerProgram";
import { Settings } from "../../src/models/settings";
import { PlannerSyntaxError } from "../../src/pages/planner/plannerExerciseEvaluator";
import { LiftoscriptDocs } from "../../src/models/liftoscriptDocs";
import { GoogleSheetsUtil } from "./googleSheets";

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
    const googleSheets = new GoogleSheetsUtil(this.secrets, this.log, this.fetch);
    const sheetData = await googleSheets.fetchSheet(url);

    // Map the spreadsheet type to our internal type
    console.log("Fetched Google Sheet data:", sheetData.content);
    return {
      content: sheetData.content,
      type: "csv", // Keep as CSV for compatibility with existing prompt logic
    };
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
        if (programContent.includes("with Formulas:")) {
          programContent = `[This is Google Sheets data with formulas. Cells show both formulas (e.g., =B2*0.8) and their calculated values. Use the formulas to understand the program structure and progressions]:\n\n${programContent}`;
        } else {
          programContent = `[This is CSV data from a spreadsheet]:\n\n${programContent}`;
        }
      } else if (contentType === "html") {
        programContent = `[This is HTML content, extract the workout program information]:\n\n${programContent}`;
      }
    }

    // Attempt conversion with validation and refinement
    let errors: PlannerSyntaxError[] = [];

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const liftoscriptDocumentation = LiftoscriptDocs.getCombinedDocs();
      const systemPrompt = `You are an expert at converting workout programs to Liftoscript format.

${liftoscriptDocumentation}

${LiftoscriptDocs.getPlannerGrammar()}

${LiftoscriptDocs.getLiftoscriptGrammar()}

${errors.length > 0 ? `\nIMPORTANT: The previous attempt had these errors: ${errors.map((e) => e.message).join("; ")}\nPlease fix these specific issues.` : ""}

Guidelines for conversion:
- Convert weight values to appropriate units (lb or kg based on context)
- Extract sets, reps, and weight from various formats
- Identify progression schemes and convert to Liftoscript progress functions
- Use state variables for tracking when needed
- Preserve the structure and intent of the original program
- For spreadsheets: look for week/day patterns in rows/columns
- For percentages: use the % notation (e.g., 80% not 0.8)

Syntax is INCREDIBLY important, it's formalized and YOU'LL NEED TO FOLLOW IT PRECISELY.
No free form text (unless in comments), and use ONLY THE EXERCISES FROM THE PROVIDED LIST. If there's no matching exercise - use a similar one, FROM THE LIST!

Return ONLY the valid Liftoscript code, no explanations, comments, or markdown code blocks.`;

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
            model: "gpt-4.1",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
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
