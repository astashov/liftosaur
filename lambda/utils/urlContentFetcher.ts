import { GoogleSheetsUtil } from "./googleSheets";
import { UrlUtils } from "../../src/utils/url";
import { IDI } from "./di";
import TurndownService from "turndown";

interface IFetchedContent {
  content: string;
  type: "text" | "csv" | "html" | "json";
}

export class UrlContentFetcher {
  private readonly turndown: TurndownService;

  constructor(private readonly di: IDI) {
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

  public isUrl(input: string): boolean {
    try {
      const url = UrlUtils.build(input.trim());
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  public async fetchUrlContent(url: string): Promise<IFetchedContent> {
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

  public convertHtmlToMarkdown(html: string): string {
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
}
