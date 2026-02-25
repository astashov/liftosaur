import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import matter from "gray-matter";
import { programOrder } from "../lambda/dao/programDao";
import { IExerciseType, IPlannerProgramWeek } from "../src/types";
import { PlannerProgram_evaluateFull, PlannerProgram_evaluateText } from "../src/pages/planner/models/plannerProgram";
import { CollectionUtils_sortInOrder } from "../src/utils/collection";
import { Settings_build } from "../src/models/settings";
import { IProgramIndexEntry } from "../src/models/program";

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

interface IProgramDetail {
  fullDescription: string;
  faq?: string;
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

function extractExerciseData(liftoscript: string): {
  exercises: IExerciseType[];
  equipment: string[];
  exercisesRange: [number, number];
} {
  const settings = Settings_build();
  const { evaluatedWeeks } = PlannerProgram_evaluateFull(liftoscript, settings);

  const exerciseMap = new Map<string, IExerciseType>();
  let minExercises = Infinity;
  let maxExercises = 0;

  if (evaluatedWeeks.success) {
    for (const week of evaluatedWeeks.data) {
      for (const day of week.days) {
        const dayExercises = day.exercises.filter((e) => !e.notused);
        const count = dayExercises.length;
        minExercises = Math.min(minExercises, count);
        maxExercises = Math.max(maxExercises, count);

        for (const exercise of dayExercises) {
          if (exercise.exerciseType) {
            const key = `${exercise.exerciseType.id}:${exercise.exerciseType.equipment}`;
            if (!exerciseMap.has(key)) {
              exerciseMap.set(key, exercise.exerciseType);
            }
          }
        }
      }
    }
  }

  if (minExercises === Infinity) {
    minExercises = 0;
  }

  const exercises = Array.from(exerciseMap.values());
  const equipmentSet = new Set<string>();
  for (const e of exercises) {
    if (e.equipment && e.equipment !== "bodyweight") {
      equipmentSet.add(e.equipment);
    }
  }

  return {
    exercises,
    equipment: Array.from(equipmentSet),
    exercisesRange: [minExercises, maxExercises],
  };
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
    const { markdown, liftoscript } = extractLiftoscriptBlock(content);

    const moreSeparator = "<!-- more -->";
    const faqSeparator = "<!-- faq -->";
    const moreIndex = markdown.indexOf(moreSeparator);
    let description: string;
    let fullDescription: string;
    let faq: string | undefined;
    if (moreIndex !== -1) {
      description = markdown.slice(0, moreIndex).trim();
      const afterMore = markdown.slice(moreIndex + moreSeparator.length).trim();
      const faqIndex = afterMore.indexOf(faqSeparator);
      if (faqIndex !== -1) {
        fullDescription = afterMore.slice(0, faqIndex).trim();
        faq = afterMore.slice(faqIndex + faqSeparator.length).trim();
      } else {
        fullDescription = afterMore;
      }
    } else {
      description = markdown.trim();
      fullDescription = "";
    }

    const weeks: IPlannerProgramWeek[] = liftoscript
      ? PlannerProgram_evaluateText(liftoscript)
      : [{ name: "Week 1", days: [{ name: "Day 1", exerciseText: "" }] }];

    const { exercises, equipment, exercisesRange } = liftoscript
      ? extractExerciseData(liftoscript)
      : { exercises: [], equipment: [], exercisesRange: [0, 0] as [number, number] };

    const entry: IProgramIndexEntry = {
      id,
      name: (frontmatter.name as string) || id,
      author: (frontmatter.author as string) || "",
      authorUrl: (frontmatter.authorUrl as string) || "",
      url: (frontmatter.url as string) || "",
      shortDescription: (frontmatter.shortDescription as string) || "",
      description,
      isMultiweek: (frontmatter.isMultiweek as boolean) || false,
      tags: (frontmatter.tags as string[]) || [],
      weeksCount: weeks.length,
      exercises: exercises.filter((e) => e.equipment != null).map((e) => ({ id: e.id, equipment: e.equipment! })),
      equipment,
      exercisesRange,
    };

    if (frontmatter.frequency != null) {
      entry.frequency = frontmatter.frequency as number;
    }
    if (frontmatter.age != null) {
      entry.age = frontmatter.age as string;
    }
    if (frontmatter.duration != null) {
      entry.duration = frontmatter.duration as string;
    }
    if (frontmatter.goal != null) {
      entry.goal = frontmatter.goal as string;
    }

    const gitDates = getGitDates(path.join(dir, file));
    if (gitDates.datePublished) {
      entry.datePublished = gitDates.datePublished;
    }
    if (gitDates.dateModified) {
      entry.dateModified = gitDates.dateModified;
    }

    index.push(entry);

    programsById[id] = {
      detail: {
        fullDescription,
        ...(faq ? { faq } : {}),
        planner: { vtype: "planner", name: (frontmatter.name as string) || id, weeks },
      },
      category,
    };

    console.log(`  ✓ ${id}`);
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
