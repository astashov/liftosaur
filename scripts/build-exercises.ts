import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import matter from "gray-matter";

const inputDir = path.resolve(__dirname, "../exercises");
const outputFile = path.resolve(__dirname, "../src/models/exerciseDescriptions.ts");

const files = fs
  .readdirSync(inputDir)
  .filter((f) => f.endsWith(".md"))
  .sort();

const entries: { key: string; content: string; video: string }[] = [];
for (const file of files) {
  const raw = fs.readFileSync(path.join(inputDir, file), "utf8");
  const { data: frontmatter, content } = matter(raw);
  const key = path.basename(file, ".md");
  const video = (frontmatter.video as string) || "";
  const trimmed = content.trim();
  entries.push({ key, content: trimmed, video });
}

const escaped = (str: string): string => str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

let ts = `// Auto-generated from exercises/*.md\n// Do not edit manually - run npm run build:exercises to update\n\nexport const exerciseDescriptions: Record<string, { content: string; video: string }> = {\n`;
for (const { key, content, video } of entries) {
  ts += `  ${key}: {\n`;
  ts += `    content: "${escaped(content)}",\n`;
  ts += `    video: "${escaped(video)}",\n`;
  ts += `  },\n`;
}
ts += `};\n`;

fs.writeFileSync(outputFile, ts);
execSync(`npx eslint --fix ${outputFile}`, { stdio: "inherit" });
console.log(`Generated ${outputFile} with ${entries.length} exercises`);
