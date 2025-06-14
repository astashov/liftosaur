import { ISecretsUtil } from "../secrets";
import { ILogUtil } from "../log";
import { GoogleSheetsUtil } from "../googleSheets";
import { ILLMProvider } from "./llmTypes";
import { UrlUtils } from "../../../src/utils/url";

interface IFetchedContent {
  content: string;
  type: "text" | "csv" | "html" | "json";
}

export class LlmUtil {
  constructor(
    private readonly secrets: ISecretsUtil,
    private readonly log: ILogUtil,
    private readonly fetch: Window["fetch"],
    private readonly provider: ILLMProvider
  ) {}

  private isUrl(input: string): boolean {
    try {
      const url = UrlUtils.build(input.trim());
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

  public async *generateLiftoscript(
    input: string
  ): AsyncGenerator<{ type: "progress" | "result" | "error" | "retry" | "finish"; data: string }, void, unknown> {
    let programContent = input;
    let contentType = "text";

    if (this.isUrl(input)) {
      yield { type: "progress", data: "Fetching content from URL..." };
      try {
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
      } catch (error) {
        yield { type: "error", data: `Failed to fetch URL: ${error}` };
        return;
      }
    }

    // Use the provider to convert
    try {
      for await (const event of this.provider.generateLiftoscript(programContent)) {
        yield event;
      }
    } catch (error) {
      this.log.log("Error in streaming conversion:", error);
      yield { type: "error", data: error instanceof Error ? error.message : "Unknown error" };
    }
  }
}
