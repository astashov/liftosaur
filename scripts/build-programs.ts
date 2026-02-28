import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import matter from "gray-matter";
import { programOrder } from "../lambda/dao/programDao";
import { CollectionUtils_sortInOrder } from "../src/utils/collection";
import { IProgramIndexEntry } from "../src/models/program";
import { parseProgramMarkdownContent } from "../src/utils/programUtils";
import { IProgramDetail } from "../src/api/service";

const programsSources = [
  { dir: path.resolve(__dirname, "../programs/builtin"), category: "builtin" },
  { dir: path.resolve(__dirname, "../programs/community"), category: "community" },
];
const outputDir = path.resolve(__dirname, "../programdata");
const programsOutputDir = path.join(outputDir, "programs");

function collectMdFiles(): { file: string; dir: string; category: string }[] {
  const results: { file: string; dir: string; category: string }[] = [];
  for (const { dir, category } of programsSources) {
    if (!fs.existsSync(dir)) {
      continue;
    }
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      results.push({ file, dir, category });
    }
  }
  return results;
}

function getGitDates(filePath: string): { datePublished?: string; dateModified?: string } {
  try {
    const dateModified = execSync(`git log -1 --format=%aI -- "${filePath}"`, { encoding: "utf8" }).trim();
    const datePublished = execSync(`git log --diff-filter=A --format=%aI -- "${filePath}"`, {
      encoding: "utf8",
    }).trim();
    return {
      ...(datePublished ? { datePublished } : {}),
      ...(dateModified ? { dateModified } : {}),
    };
  } catch {
    return {};
  }
}

function buildPrograms(): void {
  const mdFiles = collectMdFiles();
  if (mdFiles.length === 0) {
    console.log("No .md files in programs/, skipping build:programs");
    return;
  }

  const index: IProgramIndexEntry[] = [];
  const programsById: Record<string, { detail: IProgramDetail; category: string }> = {};

  for (const { file, dir, category } of mdFiles) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const { data: frontmatter, content } = matter(raw);

    const id = (frontmatter.id as string) || path.basename(file, ".md");
    const fm = { ...frontmatter, id } as Record<string, unknown>;
    const { indexEntry: entry, detail } = parseProgramMarkdownContent(content, fm);

    const gitDates = getGitDates(path.join(dir, file));
    if (gitDates.datePublished) {
      entry.datePublished = gitDates.datePublished;
    }
    if (gitDates.dateModified) {
      entry.dateModified = gitDates.dateModified;
    }

    index.push(entry);
    programsById[entry.id] = { detail, category };

    console.log(`  ✓ ${entry.id}`);
  }

  const sorted = CollectionUtils_sortInOrder(index, "id", programOrder);

  fs.mkdirSync(programsOutputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "index.json"), JSON.stringify(sorted));
  console.log(`✓ Generated programdata/index.json (${sorted.length} programs)`);

  for (const [id, { detail, category }] of Object.entries(programsById)) {
    const categoryDir = path.join(programsOutputDir, category);
    fs.mkdirSync(categoryDir, { recursive: true });
    fs.writeFileSync(path.join(categoryDir, `${id}.json`), JSON.stringify(detail));
  }
  console.log(`✓ Generated ${Object.keys(programsById).length} program detail files in programdata/programs/`);
}

buildPrograms();
