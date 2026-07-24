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

interface IHowToStep {
  name: string;
  text: string;
}

interface IEntry {
  key: string;
  content: string;
  video: string;
  description: string;
  howto: IHowToStep[];
}

function parseHowtoMarkdown(md: string): IHowToStep[] {
  const steps: IHowToStep[] = [];
  const lines = md.split("\n");
  let currentName: string | undefined;
  let currentLines: string[] = [];

  for (const line of lines) {
    const match = line.match(/^###\s+(.+)/);
    if (match) {
      if (currentName && currentLines.length > 0) {
        steps.push({ name: currentName, text: currentLines.join(" ").trim() });
      }
      currentName = match[1].trim();
      currentLines = [];
    } else if (currentName) {
      const trimmed = line.trim();
      if (trimmed) {
        currentLines.push(trimmed);
      }
    }
  }
  if (currentName && currentLines.length > 0) {
    steps.push({ name: currentName, text: currentLines.join(" ").trim() });
  }
  return steps;
}

const entries: IEntry[] = [];
for (const file of files) {
  const raw = fs.readFileSync(path.join(inputDir, file), "utf8");
  const { data: frontmatter, content } = matter(raw);
  const key = path.basename(file, ".md");
  const video = (frontmatter.video as string) || "";
  const description = (frontmatter.description as string) || "";

  const howtoDelimiter = "<!-- howto -->";
  const delimiterIndex = content.indexOf(howtoDelimiter);
  let mainContent: string;
  let howto: IHowToStep[];

  if (delimiterIndex !== -1) {
    mainContent = content.substring(0, delimiterIndex).trim();
    const howtoMd = content.substring(delimiterIndex + howtoDelimiter.length).trim();
    howto = parseHowtoMarkdown(howtoMd);
  } else {
    mainContent = content.trim();
    howto = [];
  }

  entries.push({ key, content: mainContent, video, description, howto });
}

const escaped = (str: string): string => str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

let ts = `// Auto-generated from exercises/*.md\n// Do not edit manually - run scripts/build-exercises.ts to update\n\nexport interface IExerciseHowToStep {\n  name: string;\n  text: string;\n}\n\nexport const exerciseDescriptions: Record<string, { content: string; video: string; description: string; howto: IExerciseHowToStep[] }> = {\n`;
for (const { key, content, video, description, howto } of entries) {
  ts += `  ${key}: {\n`;
  ts += `    content: "${escaped(content)}",\n`;
  ts += `    video: "${escaped(video)}",\n`;
  ts += `    description: "${escaped(description)}",\n`;
  if (howto.length > 0) {
    ts += `    howto: [\n`;
    for (const step of howto) {
      ts += `      { name: "${escaped(step.name)}", text: "${escaped(step.text)}" },\n`;
    }
    ts += `    ],\n`;
  } else {
    ts += `    howto: [],\n`;
  }
  ts += `  },\n`;
}
ts += `};\n`;

fs.writeFileSync(outputFile, ts);
execSync(`npx eslint --fix ${outputFile}`, { stdio: "inherit" });
console.log(`Generated ${outputFile} with ${entries.length} exercises`);
