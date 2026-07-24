import { PlannerEvaluator_evaluateFull } from "../src/pages/planner/plannerEvaluator";
import { Settings_build } from "../src/models/settings";
import {
  PlannerStatsUtils_dayApproxTimeMs,
  PlannerStatsUtils_calculateSetResults,
  PlannerStatsUtils_setResultsToString,
} from "../src/pages/planner/models/plannerStatsUtils";
import { PlannerProgram_fullToWeekEvalResult } from "../src/pages/planner/models/plannerProgram";
import { PlannerProgramExercise_sets } from "../src/pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise } from "../src/pages/planner/models/types";
import * as fs from "fs";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: npx ts-node scripts/validate_liftoscript.ts <file>");
  process.exit(1);
}

const content = fs.readFileSync(filePath, "utf-8");
const match = content.match(/```liftoscript\s*\n([\s\S]*?)```/m);
const program = match ? match[1] : content;

const settings = Settings_build();
const { evaluatedWeeks } = PlannerEvaluator_evaluateFull(program, settings);

if (!evaluatedWeeks.success) {
  console.error("VALIDATION ERROR:", evaluatedWeeks.error);
  process.exit(1);
}

const defaultRestTimer = settings.timers.workout ?? 180;

console.log("VALIDATION: OK\n");

console.log("Approx Workout Duration Per Day (Week 1):");
const week1 = evaluatedWeeks.data[0];
for (let dayIndex = 0; dayIndex < week1.days.length; dayIndex++) {
  const day = week1.days[dayIndex];
  const exercises = day.exercises.filter((e: IPlannerProgramExercise) => !e.notused);
  const timeMs = PlannerStatsUtils_dayApproxTimeMs(exercises, defaultRestTimer);
  const minutes = Math.round(timeMs / 60000);
  const totalSets = exercises.reduce((acc: number, e: IPlannerProgramExercise) => {
    return acc + PlannerProgramExercise_sets(e).reduce((a: number, s) => a + (s.repRange?.numberOfSets ?? 0), 0);
  }, 0);
  console.log(`  ${day.name}: ~${minutes} min (${totalSets} working sets)`);
}

console.log("");

const weekResults = PlannerProgram_fullToWeekEvalResult(evaluatedWeeks);
const setResults = PlannerStatsUtils_calculateSetResults(weekResults[0], settings);
const setResultsString = PlannerStatsUtils_setResultsToString(setResults);

console.log("Weekly Volume Per Muscle Group:");
console.log(setResultsString);
