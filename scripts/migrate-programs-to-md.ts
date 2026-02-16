import { buildDi } from "../lambda/utils/di";
import { LogUtil } from "../lambda/utils/log";
import fetch from "node-fetch";
import { ProgramDao } from "../lambda/dao/programDao";
import { PlannerProgram } from "../src/pages/planner/models/plannerProgram";
import * as fs from "fs";
import * as path from "path";

const outputDir = path.resolve(__dirname, "../programs/builtin");

function toFrontmatter(data: Record<string, unknown>): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map((v) => `"${v}"`).join(", ")}]`);
    } else if (typeof value === "boolean") {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === "string") {
      if (value.includes(":") || value.includes('"') || value.includes("'") || value.includes("#")) {
        lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const log = new LogUtil();
  const di = buildDi(log, fetch);

  process.env.IS_DEV = "false";
  const programs = await new ProgramDao(di).getAll();

  fs.mkdirSync(outputDir, { recursive: true });

  for (const payload of programs) {
    const program = payload.program;
    const id = program.id;

    const frontmatterData: Record<string, unknown> = {
      id,
      name: program.name,
      author: program.author || "",
      url: program.url || "",
      shortDescription: program.shortDescription || "",
      isMultiweek: program.isMultiweek || false,
      tags: program.tags || [],
    };

    let liftoscript = "";
    if (program.planner) {
      liftoscript = PlannerProgram.generateFullText(program.planner.weeks);
    }

    const description = program.description || "";

    const parts: string[] = [toFrontmatter(frontmatterData), "", description];

    if (liftoscript) {
      parts.push("");
      parts.push("```liftoscript");
      parts.push(liftoscript.trimEnd());
      parts.push("```");
    }

    const content = parts.join("\n") + "\n";
    const filename = `${id}.md`;
    fs.writeFileSync(path.join(outputDir, filename), content);
    console.log(`✓ ${filename} (${program.name})`);
  }

  console.log(`\nGenerated ${programs.length} program files in ${outputDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
