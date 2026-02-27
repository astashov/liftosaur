import * as fs from "fs";
import * as path from "path";
import { exerciseDescriptions } from "../src/models/exerciseDescriptions";

const outputDir = path.resolve(__dirname, "../exercises");
fs.mkdirSync(outputDir, { recursive: true });

let count = 0;
for (const [key, { content, video }] of Object.entries(exerciseDescriptions)) {
  const md = `---\nvideo: "${video}"\n---\n\n${content}\n`;
  fs.writeFileSync(path.join(outputDir, `${key}.md`), md);
  count++;
}

console.log(`Extracted ${count} exercises to ${outputDir}`);
