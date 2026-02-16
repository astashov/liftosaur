import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";
import { programOrder } from "../lambda/dao/programDao";
import { IPlannerProgramWeek } from "../src/types";
import { PlannerProgram } from "../src/pages/planner/models/plannerProgram";
import { CollectionUtils } from "../src/utils/collection";

const programsSources = [
  { dir: path.resolve(__dirname, "../programs/builtin"), category: "builtin" },
  { dir: path.resolve(__dirname, "../programs/community"), category: "community" },
];
const outputDir = path.resolve(__dirname, "../programdata");
const programsOutputDir = path.join(outputDir, "programs");

function extractLiftoscriptBlock(content: string): { markdown: string; liftoscript: string } {
  const liftoscriptRegex = /^```liftoscript\s*\n([\s\S]*?)^```\s*$/m;
  const match = content.match(liftoscriptRegex);
  if (!match) {
    return { markdown: content, liftoscript: "" };
  }
  const markdown = content.slice(0, match.index) + content.slice(match.index! + match[0].length);
  return { markdown: markdown.trim(), liftoscript: match[1].trim() };
}

interface IProgramIndexEntry {
  id: string;
  name: string;
  author: string;
  authorUrl: string;
  url: string;
  shortDescription: string;
  isMultiweek: boolean;
  tags: string[];
}

interface IProgramDetail {
  description: string;
  fullDescription: string;
  planner: {
    vtype: "planner";
    name: string;
    weeks: IPlannerProgramWeek[];
  };
}

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
    const { markdown, liftoscript } = extractLiftoscriptBlock(content);

    const moreSeparator = "<!-- more -->";
    const moreIndex = markdown.indexOf(moreSeparator);
    let description: string;
    let fullDescription: string;
    if (moreIndex !== -1) {
      description = markdown.slice(0, moreIndex).trim();
      fullDescription = markdown.slice(moreIndex + moreSeparator.length).trim();
    } else {
      description = markdown.trim();
      fullDescription = "";
    }

    const weeks: IPlannerProgramWeek[] = liftoscript
      ? PlannerProgram.evaluateText(liftoscript)
      : [{ name: "Week 1", days: [{ name: "Day 1", exerciseText: "" }] }];

    index.push({
      id,
      name: (frontmatter.name as string) || id,
      author: (frontmatter.author as string) || "",
      authorUrl: (frontmatter.authorUrl as string) || "",
      url: (frontmatter.url as string) || "",
      shortDescription: (frontmatter.shortDescription as string) || "",
      isMultiweek: (frontmatter.isMultiweek as boolean) || false,
      tags: (frontmatter.tags as string[]) || [],
    });

    programsById[id] = {
      detail: {
        description,
        fullDescription,
        planner: { vtype: "planner", name: (frontmatter.name as string) || id, weeks },
      },
      category,
    };

    console.log(`  ✓ ${id}`);
  }

  const sorted = CollectionUtils.sortInOrder(index, "id", programOrder);

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
