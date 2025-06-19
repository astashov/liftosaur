import { GoogleSheetsUtil } from "../googleSheets";
import { ILLMProvider } from "./llmTypes";
import { UrlUtils } from "../../../src/utils/url";
import { IAccount } from "../../../src/models/account";
import { IDI } from "../di";
import { AiLogsDao } from "../../dao/aiLogsDao";
import TurndownService from "turndown";

interface IFetchedContent {
  content: string;
  type: "text" | "csv" | "html" | "json";
}

export class LlmUtil {
  private turndown: TurndownService;

  constructor(
    private readonly di: IDI,
    private readonly provider: ILLMProvider
  ) {
    this.turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
    });

    this.turndown.addRule("tables", {
      filter: ["table"],
      replacement: function (content, node) {
        // Keep tables as they often contain workout data
        return "\n\n[TABLE]\n" + (node as Element).outerHTML + "\n[/TABLE]\n\n";
      },
    });
  }

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
      if (url.includes("docs.google.com/spreadsheets")) {
        return await this.fetchGoogleSheet(url);
      }

      const response = await this.di.fetch(url);
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
      this.di.log.log("Error fetching URL:", error);
      throw new Error(`Failed to fetch content from URL: ${error}`);
    }
  }

  private async fetchGoogleSheet(url: string): Promise<IFetchedContent> {
    const googleSheets = new GoogleSheetsUtil(this.di.secrets, this.di.log, this.di.fetch);
    const sheetData = await googleSheets.fetchSheet(url);
    return {
      content: sheetData.content,
      type: "csv",
    };
  }

  private convertHtmlToMarkdown(html: string): string {
    try {
      const cleanHtml = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove scripts
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ""); // Remove styles

      const markdown = this.turndown.turndown(cleanHtml);

      return markdown.replace(/\n{3,}/g, "\n\n").replace(/^\s+|\s+$/g, "");
    } catch (error) {
      this.di.log.log("Error converting HTML to Markdown:", error);
      return html;
    }
  }

  public async *generateLiftoscript(
    input: string,
    account: IAccount
  ): AsyncGenerator<{ type: "progress" | "result" | "error" | "retry" | "finish"; data: string }, void, unknown> {
    let programContent = input;
    let contentType = "text";
    let fullResponse = "";
    let error: string | undefined;

    if (this.isUrl(input)) {
      yield { type: "progress", data: "Fetching content from URL..." };
      try {
        const fetched = await this.fetchUrlContent(input);
        programContent = fetched.content;
        contentType = fetched.type;

        if (contentType === "csv") {
          if (programContent.includes("with Formulas:")) {
            programContent = `[This is Google Sheets data with formulas. Cells show both formulas (e.g., =B2*0.8) and their calculated values. Use the formulas to understand the program structure and progressions]:\n\n${programContent}`;
          } else {
            programContent = `[This is CSV data from a spreadsheet]:\n\n${programContent}`;
          }
        } else if (contentType === "html") {
          const markdownContent = this.convertHtmlToMarkdown(programContent);
          programContent = `[This content was extracted from a webpage and converted to Markdown format. Tables are preserved in HTML format between [TABLE] tags. Extract the workout program information]:\n\n${markdownContent}`;
        }
      } catch (err) {
        error = `Failed to fetch URL: ${err}`;
        yield { type: "error", data: error };
        await this.logAiInteraction(account, input, "", error);
        return;
      }
    }

    try {
      for await (const event of this.provider.generateLiftoscript(programContent)) {
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

    await this.logAiInteraction(account, input, fullResponse, error);
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
