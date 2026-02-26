import { IExerciseType, IPlannerProgramWeek } from "../types";
import { PlannerProgram_evaluateFull, PlannerProgram_evaluateText } from "../pages/planner/models/plannerProgram";
import { Settings_build } from "../models/settings";
import { IProgramIndexEntry } from "../models/program";
import { IProgramDetail } from "../api/service";

export function extractLiftoscriptBlock(content: string): { markdown: string; liftoscript: string } {
  const liftoscriptRegex = /^```liftoscript\s*\n([\s\S]*?)^```\s*$/m;
  const match = content.match(liftoscriptRegex);
  if (!match) {
    return { markdown: content, liftoscript: "" };
  }
  const markdown = content.slice(0, match.index) + content.slice(match.index! + match[0].length);
  return { markdown: markdown.trim(), liftoscript: match[1].trim() };
}

export function extractExerciseData(liftoscript: string): {
  exercises: IExerciseType[];
  equipment: string[];
  exercisesRange: [number, number];
  error?: string;
} {
  const settings = Settings_build();
  const { evaluatedWeeks } = PlannerProgram_evaluateFull(liftoscript, settings);

  const exerciseMap = new Map<string, IExerciseType>();
  let minExercises = Infinity;
  let maxExercises = 0;
  let error: string | undefined;

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
  } else {
    error = evaluatedWeeks.error.message;
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
    error,
  };
}

export function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
  const match = raw.match(fmRegex);
  if (!match) {
    return { data: {}, content: raw };
  }
  const yaml = match[1];
  const content = raw.slice(match[0].length);
  const data: Record<string, unknown> = {};

  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) {
      continue;
    }
    const key = trimmed.slice(0, colonIdx).trim();
    const value: string | number | boolean | string[] = trimmed.slice(colonIdx + 1).trim();

    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      if (inner === "") {
        data[key] = [];
      } else {
        data[key] = inner.split(",").map((s) => {
          let item = s.trim();
          if ((item.startsWith('"') && item.endsWith('"')) || (item.startsWith("'") && item.endsWith("'"))) {
            item = item.slice(1, -1);
          }
          return item;
        });
      }
      continue;
    }

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      data[key] = value.slice(1, -1);
      continue;
    }

    if (value === "true") {
      data[key] = true;
      continue;
    }
    if (value === "false") {
      data[key] = false;
      continue;
    }

    const num = Number(value);
    if (value !== "" && !isNaN(num)) {
      data[key] = num;
      continue;
    }

    data[key] = value;
  }

  return { data, content };
}

export function parseProgramMarkdownContent(
  content: string,
  frontmatter: Record<string, unknown>
): {
  indexEntry: IProgramIndexEntry;
  detail: IProgramDetail;
  liftoscriptError?: string;
} {
  const id = (frontmatter.id as string) || "preview";
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

  const {
    exercises,
    equipment,
    exercisesRange,
    error: liftoscriptError,
  } = liftoscript
    ? extractExerciseData(liftoscript)
    : { exercises: [], equipment: [], exercisesRange: [0, 0] as [number, number], error: undefined };

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

  const detail: IProgramDetail = {
    fullDescription,
    ...(faq ? { faq } : {}),
    planner: { vtype: "planner", name: (frontmatter.name as string) || id, weeks },
  };

  return { indexEntry: entry, detail, liftoscriptError };
}
