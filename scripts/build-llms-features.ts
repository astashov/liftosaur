import * as fs from "fs";
import * as path from "path";
import { parseDocMarkdown } from "../src/utils/docUtils";
import { LlmsFeatures_compile } from "./llmsFeatures";

const featuresDir = path.resolve(__dirname, "../docs/features");
const outFile = path.resolve(__dirname, "../llms/features.md");

const pages = fs
  .readdirSync(featuresDir)
  .filter((f) => f.endsWith(".md"))
  .map((f) => parseDocMarkdown(fs.readFileSync(path.join(featuresDir, f), "utf8")));

fs.writeFileSync(outFile, LlmsFeatures_compile(pages));
console.log(`Wrote ${outFile} from ${pages.length} pages`);
