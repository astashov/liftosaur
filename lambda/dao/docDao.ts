import * as fs from "fs";
import * as path from "path";
import { IDocIndexEntry } from "../../src/models/doc";
import { IDocDetail, parseDocMarkdown } from "../../src/utils/docUtils";

export class DocDao {
  private readonly docsDir: string;

  constructor() {
    this.docsDir = path.join(__dirname, "..", "docs", "content");
  }

  public getIndex(): IDocIndexEntry[] {
    if (!fs.existsSync(this.docsDir)) {
      return [];
    }
    const files = fs.readdirSync(this.docsDir).filter((f) => f.endsWith(".md"));
    const entries: IDocIndexEntry[] = [];
    for (const file of files) {
      const raw = fs.readFileSync(path.join(this.docsDir, file), "utf8");
      const { indexEntry } = parseDocMarkdown(raw);
      entries.push(indexEntry);
    }
    entries.sort((a, b) => a.order - b.order);
    return entries;
  }

  public getById(id: string): { indexEntry: IDocIndexEntry; detail: IDocDetail } | undefined {
    const filePath = path.join(this.docsDir, `${id}.md`);
    if (!fs.existsSync(filePath)) {
      return undefined;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    return parseDocMarkdown(raw);
  }
}
