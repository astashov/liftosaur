import * as fs from "fs";
import * as path from "path";
import {
  IHistoryRecord,
  IPlannerProgram,
  IProgram,
  IStatsLengthValue,
  IStatsPercentageValue,
  IStatsWeightValue,
  IStorage,
  IWeight,
} from "../../src/types";
import { Storage_getDefault, Storage_validateStorage } from "../../src/models/storage";
import { Settings_build } from "../../src/models/settings";
import { Stats_getEmpty } from "../../src/models/stats";
import { Program_create, Program_nextHistoryRecord, Program_runAllFinishDayScripts } from "../../src/models/program";
import { PlannerProgram_evaluateText } from "../../src/pages/planner/models/plannerProgram";
import { PlannerEvaluator_evaluateFull } from "../../src/pages/planner/plannerEvaluator";
import { basicBeginnerProgram } from "../../src/programs/basicBeginnerProgram";

const root = path.resolve(__dirname, "../..");
const programText = fs.readFileSync(path.join(root, "screenshots/fixtures/demo-program.txt"), "utf8");
const outPath = path.join(root, "screenshots/fixtures/demo.json");

const weeksOfHistory = 12;
const workoutWeekdayOffsets = [0, 1, 3, 4];
const workoutHour = 18;
const workoutMinutes = 55;

function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}

function lb(value: number): IWeight {
  return { value, unit: "lb" };
}

function mondayWeeksAgo(weeksAgo: number): Date {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  monday.setDate(monday.getDate() - weeksAgo * 7);
  return monday;
}

function completeSets(record: IHistoryRecord, random: () => number): void {
  for (const entry of record.entries) {
    entry.sets.forEach((set, index) => {
      const isLast = index === entry.sets.length - 1;
      const reps = set.reps ?? 0;
      const missed = isLast && random() < 0.3;
      set.isCompleted = true;
      set.completedReps = set.isAmrap ? reps + Math.floor(random() * 4) : missed ? Math.max(1, reps - 1) : reps;
      set.completedWeight = set.weight;
      if (set.askWeight) {
        set.completedWeight = lb(Math.round(random() * 3) * 5 + 25);
      }
      if (set.logRpe) {
        set.completedRpe = 7 + Math.round(random() * 4) / 2;
      }
      if (set.setTimer != null) {
        set.completedSetTimer = set.setTimer;
      }
    });
  }
}

function buildHistory(
  program: IProgram,
  settings: ReturnType<typeof Settings_build>
): { history: IHistoryRecord[]; program: IProgram } {
  const random = seededRandom(20260927);
  const stats = Stats_getEmpty();
  const history: IHistoryRecord[] = [];
  let current = program;
  for (let week = weeksOfHistory - 1; week >= 0; week--) {
    const monday = mondayWeeksAgo(week);
    for (const offset of workoutWeekdayOffsets) {
      const start = new Date(monday);
      start.setDate(monday.getDate() + offset);
      start.setHours(workoutHour, 0, 0, 0);
      if (start.getTime() > Date.now()) {
        continue;
      }
      const record = Program_nextHistoryRecord(current, settings, stats);
      completeSets(record, random);
      record.vtype = "history_record";
      record.id = start.getTime();
      record.date = start.toISOString();
      record.startTime = start.getTime();
      record.endTime = start.getTime() + workoutMinutes * 60 * 1000;
      record.intervals = [[record.startTime, record.endTime]];
      history.unshift(record);
      const finished = Program_runAllFinishDayScripts(current, record, stats, settings, (message) => {
        throw new Error(message);
      });
      current = finished.program;
      for (const key of Object.keys(finished.exerciseData)) {
        settings.exerciseData[key] = { ...settings.exerciseData[key], ...finished.exerciseData[key] };
      }
    }
  }
  return { history, program: current };
}

function buildStats(): IStorage["stats"] {
  const stats = Stats_getEmpty();
  const weight: IStatsWeightValue[] = [];
  const waist: IStatsLengthValue[] = [];
  const chest: IStatsLengthValue[] = [];
  const bodyfat: IStatsPercentageValue[] = [];
  for (let week = weeksOfHistory; week >= 0; week--) {
    const timestamp = mondayWeeksAgo(week).getTime() + 8 * 60 * 60 * 1000;
    const progress = (weeksOfHistory - week) / weeksOfHistory;
    weight.push({ vtype: "stat", timestamp, value: lb(Math.round((184 - progress * 6) * 10) / 10) });
    if (week % 2 === 0) {
      waist.push({
        vtype: "stat",
        timestamp,
        value: { value: Math.round((34.5 - progress * 1.5) * 10) / 10, unit: "in" },
      });
      chest.push({ vtype: "stat", timestamp, value: { value: Math.round((41 + progress * 1) * 10) / 10, unit: "in" } });
      bodyfat.push({
        vtype: "stat",
        timestamp,
        value: { value: Math.round((19 - progress * 2.5) * 10) / 10, unit: "%" },
      });
    }
  }
  return {
    ...stats,
    weight: { ...stats.weight, weight },
    length: { ...stats.length, waist, chest },
    percentage: { ...stats.percentage, bodyfat },
  };
}

function main(): void {
  const settings = Settings_build();
  const evaluated = PlannerEvaluator_evaluateFull(programText, settings);
  if (!evaluated.evaluatedWeeks.success) {
    throw new Error(`demo-program.txt does not parse: ${evaluated.evaluatedWeeks.error}`);
  }
  const planner: IPlannerProgram = {
    vtype: "planner",
    name: "Demo Program",
    weeks: PlannerProgram_evaluateText(programText),
  };
  const program: IProgram = {
    ...Program_create("Demo Program", "demo"),
    planner,
    clonedAt: mondayWeeksAgo(weeksOfHistory).getTime(),
  };
  const { history, program: progressedProgram } = buildHistory(program, settings);

  const storage = Storage_getDefault();
  storage.programs = [
    progressedProgram,
    { ...basicBeginnerProgram, clonedAt: mondayWeeksAgo(weeksOfHistory + 8).getTime() },
  ];
  storage.currentProgramId = progressedProgram.id;
  storage.history = history;
  storage.stats = buildStats();
  storage.settings = settings;

  const validated = Storage_validateStorage(JSON.parse(JSON.stringify(storage)));
  if (!validated.success) {
    throw new Error(`fixture is invalid: ${validated.error.join(", ")}`);
  }
  fs.writeFileSync(outPath, JSON.stringify(storage, null, 2));
  console.log(`${outPath}: ${history.length} workouts, ${storage.stats.weight.weight?.length ?? 0} bodyweight entries`);
}

main();
