import "mocha";
import { expect } from "chai";
import { Settings_build } from "../src/models/settings";
import { Weight_build } from "../src/models/weight";
import { LiftohistorySerializer_serialize } from "../src/liftohistory/liftohistorySerializer";
import {
  LiftohistoryDeserializer_deserialize,
  LiftohistorySyntaxError,
} from "../src/liftohistory/liftohistoryDeserializer";
import { IHistoryRecord, IHistoryEntry, ISet, ISettings } from "../src/types";
import { UidFactory_generateUid } from "../src/utils/generator";

function buildSettings(): ISettings {
  return Settings_build();
}

function buildSet(overrides: Partial<ISet> = {}): ISet {
  return {
    vtype: "set",
    id: UidFactory_generateUid(6),
    index: 0,
    ...overrides,
  };
}

function buildEntry(overrides: Partial<IHistoryEntry> & Pick<IHistoryEntry, "exercise">): IHistoryEntry {
  return {
    vtype: "history_entry",
    id: overrides.exercise.id,
    index: 0,
    sets: [],
    warmupSets: [],
    ...overrides,
  };
}

function buildRecord(overrides: Partial<IHistoryRecord> = {}): IHistoryRecord {
  return {
    vtype: "history_record",
    date: "2026-02-28T10:30:00.000Z",
    programId: "emptyprogram",
    programName: "Adhoc",
    day: 1,
    dayName: "Workout",
    entries: [],
    startTime: new Date("2026-02-28T10:30:00.000Z").getTime(),
    id: new Date("2026-02-28T10:30:00.000Z").getTime(),
    ...overrides,
  };
}

describe("Liftohistory", () => {
  describe("Serializer", () => {
    it("serializes adhoc workout with no entries", () => {
      const settings = buildSettings();
      const record = buildRecord();
      const result = LiftohistorySerializer_serialize(record, settings);
      expect(result).to.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [+-]\d{2}:\d{2} \/ exercises: \{\n\}$/);
    });

    it("serializes completed sets grouped by reps/weight", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [
              buildSet({ completedReps: 8, completedWeight: Weight_build(185, "lb"), isCompleted: true }),
              buildSet({ completedReps: 8, completedWeight: Weight_build(185, "lb"), isCompleted: true }),
              buildSet({ completedReps: 8, completedWeight: Weight_build(185, "lb"), isCompleted: true }),
            ],
          }),
        ],
      });
      const result = LiftohistorySerializer_serialize(record, settings);
      expect(result).to.include("Squat / 3x8 185lb");
    });

    it("serializes different completed sets ungrouped", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [
              buildSet({ completedReps: 8, completedWeight: Weight_build(185, "lb"), isCompleted: true }),
              buildSet({ completedReps: 6, completedWeight: Weight_build(185, "lb"), isCompleted: true }),
            ],
          }),
        ],
      });
      const result = LiftohistorySerializer_serialize(record, settings);
      expect(result).to.include("1x8 185lb, 1x6 185lb");
    });

    it("serializes warmup sets", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [buildSet({ completedReps: 5, completedWeight: Weight_build(200, "lb"), isCompleted: true })],
            warmupSets: [
              buildSet({ completedReps: 10, completedWeight: Weight_build(95, "lb"), isCompleted: true }),
              buildSet({ completedReps: 5, completedWeight: Weight_build(135, "lb"), isCompleted: true }),
            ],
          }),
        ],
      });
      const result = LiftohistorySerializer_serialize(record, settings);
      expect(result).to.include("/ warmup: 1x10 95lb, 1x5 135lb");
    });

    it("serializes target sets", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [
              buildSet({
                completedReps: 8,
                completedWeight: Weight_build(185, "lb"),
                reps: 10,
                weight: Weight_build(185, "lb"),
                isCompleted: true,
              }),
              buildSet({
                completedReps: 8,
                completedWeight: Weight_build(185, "lb"),
                reps: 10,
                weight: Weight_build(185, "lb"),
                isCompleted: true,
              }),
            ],
          }),
        ],
      });
      const result = LiftohistorySerializer_serialize(record, settings);
      expect(result).to.include("/ target: 2x10 185lb");
    });

    it("serializes AMRAP in target only, not completed", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [
              buildSet({
                completedReps: 12,
                completedWeight: Weight_build(100, "lb"),
                isAmrap: true,
                reps: 5,
                weight: Weight_build(100, "lb"),
                isCompleted: true,
              }),
            ],
          }),
        ],
      });
      const result = LiftohistorySerializer_serialize(record, settings);
      expect(result).to.include("1x12 100lb");
      expect(result).to.include("/ target: 1x5+ 100lb");
    });

    it("serializes askWeight in target sets", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [
              buildSet({
                completedReps: 5,
                completedWeight: Weight_build(100, "lb"),
                reps: 5,
                weight: Weight_build(100, "lb"),
                askWeight: true,
                isCompleted: true,
              }),
            ],
          }),
        ],
      });
      const result = LiftohistorySerializer_serialize(record, settings);
      expect(result).to.include("/ target: 1x5 100lb+");
    });

    it("serializes RPE", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [
              buildSet({
                completedReps: 5,
                completedWeight: Weight_build(200, "lb"),
                completedRpe: 8.5,
                isCompleted: true,
              }),
            ],
          }),
        ],
      });
      const result = LiftohistorySerializer_serialize(record, settings);
      expect(result).to.include("1x5 200lb @8.5");
    });

    it("serializes unilateral sets", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [
              buildSet({
                completedReps: 10,
                completedRepsLeft: 8,
                completedWeight: Weight_build(50, "lb"),
                isUnilateral: true,
                isCompleted: true,
              }),
            ],
          }),
        ],
      });
      const result = LiftohistorySerializer_serialize(record, settings);
      expect(result).to.include("1x10|8 50lb");
    });

    it("serializes set labels", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [
              buildSet({
                completedReps: 5,
                completedWeight: Weight_build(100, "lb"),
                label: "paused",
                isCompleted: true,
              }),
            ],
          }),
        ],
      });
      const result = LiftohistorySerializer_serialize(record, settings);
      expect(result).to.include("1x5 100lb (paused)");
    });

    it("serializes target with rep range", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [
              buildSet({
                completedReps: 10,
                completedWeight: Weight_build(100, "lb"),
                reps: 12,
                minReps: 8,
                weight: Weight_build(100, "lb"),
                isCompleted: true,
              }),
            ],
          }),
        ],
      });
      const result = LiftohistorySerializer_serialize(record, settings);
      expect(result).to.include("/ target: 1x8-12 100lb");
    });

    it("serializes target with logRpe", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [
              buildSet({
                completedReps: 5,
                completedWeight: Weight_build(200, "lb"),
                reps: 5,
                weight: Weight_build(200, "lb"),
                rpe: 8,
                logRpe: true,
                isCompleted: true,
              }),
            ],
          }),
        ],
      });
      const result = LiftohistorySerializer_serialize(record, settings);
      expect(result).to.include("/ target: 1x5 200lb @8+");
    });

    it("serializes target with timer", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [
              buildSet({
                completedReps: 5,
                completedWeight: Weight_build(200, "lb"),
                reps: 5,
                weight: Weight_build(200, "lb"),
                timer: 90,
                isCompleted: true,
              }),
            ],
          }),
        ],
      });
      const result = LiftohistorySerializer_serialize(record, settings);
      expect(result).to.include("/ target: 1x5 200lb 90s");
    });

    it("serializes duration from intervals", () => {
      const settings = buildSettings();
      const start = new Date("2026-02-28T10:30:00.000Z").getTime();
      const record = buildRecord({
        startTime: start,
        endTime: start + 3600000,
        intervals: [[start, start + 3600000]],
      });
      const result = LiftohistorySerializer_serialize(record, settings);
      expect(result).to.include("/ duration: 3600s");
    });

    it("serializes workout notes", () => {
      const settings = buildSettings();
      const record = buildRecord({ notes: "Great session" });
      const result = LiftohistorySerializer_serialize(record, settings);
      expect(result).to.include("// Great session\n");
    });

    it("serializes multiline workout notes", () => {
      const settings = buildSettings();
      const record = buildRecord({ notes: "Line one\nLine two" });
      const result = LiftohistorySerializer_serialize(record, settings);
      expect(result).to.include("// Line one\n// Line two\n");
    });

    it("serializes exercise notes", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [buildSet({ completedReps: 5, completedWeight: Weight_build(100, "lb"), isCompleted: true })],
            notes: "Felt heavy",
          }),
        ],
      });
      const result = LiftohistorySerializer_serialize(record, settings);
      expect(result).to.include("  // Felt heavy\n  Squat");
    });

    it("serializes kg weights", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [buildSet({ completedReps: 5, completedWeight: Weight_build(100, "kg"), isCompleted: true })],
          }),
        ],
      });
      const result = LiftohistorySerializer_serialize(record, settings);
      expect(result).to.include("1x5 100kg");
    });
  });

  describe("Deserializer", () => {
    it("parses minimal adhoc workout", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / exercises: {\n}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      expect(result.data.historyRecords).to.have.length(1);
      const record = result.data.historyRecords[0];
      expect(record.programId).to.equal("emptyprogram");
      expect(record.entries).to.have.length(0);
    });

    it("parses program metadata with day", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / program: "Starting Strength" / day: 3 / exercises: {\n}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      const record = result.data.historyRecords[0];
      expect(record.programName).to.equal("Starting Strength");
      expect(record.day).to.equal(3);
      expect(record.programId).to.equal("starting-strength");
    });

    it("parses multi-week metadata", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / program: "5/3/1" / dayName: "Push Day" / week: 2 / dayInWeek: 1 / exercises: {\n}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      const record = result.data.historyRecords[0];
      expect(record.dayName).to.equal("Push Day");
      expect(record.week).to.equal(2);
      expect(record.dayInWeek).to.equal(1);
    });

    it("parses duration", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / duration: 3600s / exercises: {\n}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      const record = result.data.historyRecords[0];
      expect(record.endTime! - record.startTime).to.equal(3600000);
    });

    it("parses completed sets", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / exercises: {
  Squat, Barbell / 3x8 185lb
}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      const entry = result.data.historyRecords[0].entries[0];
      expect(entry.exercise.id).to.equal("squat");
      expect(entry.sets).to.have.length(3);
      expect(entry.sets[0].completedReps).to.equal(8);
      expect(entry.sets[0].completedWeight).to.deep.equal(Weight_build(185, "lb"));
    });

    it("parses warmup sets", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / exercises: {
  Squat, Barbell / 1x5 200lb / warmup: 1x10 95lb, 1x5 135lb
}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      const entry = result.data.historyRecords[0].entries[0];
      expect(entry.warmupSets).to.have.length(2);
      expect(entry.warmupSets[0].completedReps).to.equal(10);
      expect(entry.warmupSets[0].completedWeight).to.deep.equal(Weight_build(95, "lb"));
      expect(entry.warmupSets[1].completedReps).to.equal(5);
      expect(entry.warmupSets[1].completedWeight).to.deep.equal(Weight_build(135, "lb"));
    });

    it("parses target sets and merges with completed", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / exercises: {
  Squat, Barbell / 3x8 185lb / target: 3x10 185lb
}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      const entry = result.data.historyRecords[0].entries[0];
      expect(entry.sets).to.have.length(3);
      expect(entry.sets[0].completedReps).to.equal(8);
      expect(entry.sets[0].reps).to.equal(10);
      expect(entry.sets[0].weight).to.deep.equal(Weight_build(185, "lb"));
    });

    it("parses AMRAP sets", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / exercises: {
  Squat, Barbell / 1x12+ 100lb
}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      const set = result.data.historyRecords[0].entries[0].sets[0];
      expect(set.completedReps).to.equal(12);
      expect(set.isAmrap).to.equal(true);
    });

    it("parses RPE", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / exercises: {
  Squat, Barbell / 1x5 200lb @8.5
}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      const set = result.data.historyRecords[0].entries[0].sets[0];
      expect(set.completedRpe).to.equal(8.5);
    });

    it("parses logRpe in target", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / exercises: {
  Squat, Barbell / 1x5 200lb / target: 1x5 200lb @8+
}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      const set = result.data.historyRecords[0].entries[0].sets[0];
      expect(set.rpe).to.equal(8);
      expect(set.logRpe).to.equal(true);
    });

    it("parses askWeight in target", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / exercises: {
  Squat, Barbell / 1x5 100lb / target: 1x5 100lb+
}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      const set = result.data.historyRecords[0].entries[0].sets[0];
      expect(set.weight).to.deep.equal(Weight_build(100, "lb"));
      expect(set.askWeight).to.equal(true);
    });

    it("parses unilateral reps", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / exercises: {
  Squat, Barbell / 1x10|8 50lb
}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      const set = result.data.historyRecords[0].entries[0].sets[0];
      expect(set.completedReps).to.equal(10);
      expect(set.completedRepsLeft).to.equal(8);
      expect(set.isUnilateral).to.equal(true);
    });

    it("parses rep range in target", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / exercises: {
  Squat, Barbell / 1x10 100lb / target: 1x8-12 100lb
}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      const set = result.data.historyRecords[0].entries[0].sets[0];
      expect(set.minReps).to.equal(8);
      expect(set.reps).to.equal(12);
    });

    it("parses timer in target set", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / exercises: {
  Squat, Barbell / 1x5 200lb / target: 1x5 200lb 90s
}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      const set = result.data.historyRecords[0].entries[0].sets[0];
      expect(set.timer).to.equal(90);
    });

    it("parses set labels", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / exercises: {
  Squat, Barbell / 1x5 100lb (paused)
}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      const set = result.data.historyRecords[0].entries[0].sets[0];
      expect(set.label).to.equal("paused");
    });

    it("parses workout notes before record", () => {
      const settings = buildSettings();
      const text = `// Great session
2026-02-28T10:30:00.000Z / exercises: {
}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      expect(result.data.historyRecords[0].notes).to.equal("Great session");
    });

    it("parses multiline workout notes", () => {
      const settings = buildSettings();
      const text = `// Line one
// Line two
2026-02-28T10:30:00.000Z / exercises: {
}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      expect(result.data.historyRecords[0].notes).to.equal("Line one\nLine two");
    });

    it("parses exercise notes", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / exercises: {
  // Felt heavy
  Squat, Barbell / 1x5 100lb
}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      expect(result.data.historyRecords[0].entries[0].notes).to.equal("Felt heavy");
    });

    it("preserves relative indentation in notes", () => {
      const settings = buildSettings();
      const text = `//   Intro
//
//       Indented line
2026-02-28T10:30:00.000Z / exercises: {
}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      expect(result.data.historyRecords[0].notes).to.equal("Intro\n\n    Indented line");
    });

    it("parses date with space separator", () => {
      const settings = buildSettings();
      const text = `2026-02-28 10:30:00 +00:00 / exercises: {\n}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      expect(result.data.historyRecords[0].startTime).to.equal(new Date("2026-02-28T10:30:00+00:00").getTime());
    });

    it("parses date with T and space before timezone", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00 +00:00 / exercises: {\n}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      expect(result.data.historyRecords[0].startTime).to.equal(new Date("2026-02-28T10:30:00+00:00").getTime());
    });

    it("parses multiple workouts", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / exercises: {
  Squat, Barbell / 1x5 100lb
}

2026-03-01T10:30:00.000Z / exercises: {
  Bench Press, Barbell / 1x5 135lb
}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      expect(result.data.historyRecords).to.have.length(2);
      expect(result.data.historyRecords[0].entries[0].exercise.id).to.equal("squat");
      expect(result.data.historyRecords[1].entries[0].exercise.id).to.equal("benchPress");
    });

    it("creates custom exercises for unknown names", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / exercises: {
  My Custom Exercise / 3x10 50kg
}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      const customExercises = result.data.customExercises;
      const keys = Object.keys(customExercises);
      expect(keys).to.have.length(1);
      expect(customExercises[keys[0]].name).to.equal("My Custom Exercise");
    });

    it("parses kg weights", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / exercises: {
  Squat, Barbell / 3x5 100kg
}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.true;
      if (!result.success) {
        return;
      }
      expect(result.data.historyRecords[0].entries[0].sets[0].completedWeight).to.deep.equal(Weight_build(100, "kg"));
    });

    it("errors on duplicate exercise in same workout", () => {
      const settings = buildSettings();
      const text = `2026-02-28T10:30:00.000Z / exercises: {
  Squat, Barbell / 3x5 100lb
  Squat, Barbell / 3x5 120lb
}`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.false;
      if (result.success) {
        return;
      }
      expect(result.error[0]).to.be.instanceOf(LiftohistorySyntaxError);
      expect(result.error[0].message).to.include("Duplicate exercise");
    });

    it("errors on syntax errors", () => {
      const settings = buildSettings();
      const text = `this is not valid liftohistory`;
      const result = LiftohistoryDeserializer_deserialize(text, settings);
      expect(result.success).to.be.false;
    });
  });

  describe("Round-trip", () => {
    it("serializes and deserializes basic workout", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [
              buildSet({
                completedReps: 8,
                completedWeight: Weight_build(185, "lb"),
                reps: 10,
                weight: Weight_build(185, "lb"),
                isCompleted: true,
              }),
              buildSet({
                completedReps: 8,
                completedWeight: Weight_build(185, "lb"),
                reps: 10,
                weight: Weight_build(185, "lb"),
                isCompleted: true,
              }),
              buildSet({
                completedReps: 8,
                completedWeight: Weight_build(185, "lb"),
                reps: 10,
                weight: Weight_build(185, "lb"),
                isCompleted: true,
              }),
            ],
          }),
        ],
      });

      const serialized = LiftohistorySerializer_serialize(record, settings);
      const deserialized = LiftohistoryDeserializer_deserialize(serialized, settings);
      expect(deserialized.success).to.be.true;
      if (!deserialized.success) {
        return;
      }

      const newRecord = deserialized.data.historyRecords[0];
      expect(newRecord.entries).to.have.length(1);
      expect(newRecord.entries[0].exercise.id).to.equal("squat");
      expect(newRecord.entries[0].sets).to.have.length(3);
      expect(newRecord.entries[0].sets[0].completedReps).to.equal(8);
      expect(newRecord.entries[0].sets[0].completedWeight).to.deep.equal(Weight_build(185, "lb"));
      expect(newRecord.entries[0].sets[0].reps).to.equal(10);
      expect(newRecord.entries[0].sets[0].weight).to.deep.equal(Weight_build(185, "lb"));
    });

    it("round-trips warmup sets", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "benchPress", equipment: "barbell" },
            sets: [buildSet({ completedReps: 5, completedWeight: Weight_build(185, "lb"), isCompleted: true })],
            warmupSets: [
              buildSet({ completedReps: 10, completedWeight: Weight_build(95, "lb"), isCompleted: true }),
              buildSet({ completedReps: 5, completedWeight: Weight_build(135, "lb"), isCompleted: true }),
            ],
          }),
        ],
      });

      const serialized = LiftohistorySerializer_serialize(record, settings);
      const deserialized = LiftohistoryDeserializer_deserialize(serialized, settings);
      expect(deserialized.success).to.be.true;
      if (!deserialized.success) {
        return;
      }

      const warmupSets = deserialized.data.historyRecords[0].entries[0].warmupSets;
      expect(warmupSets).to.have.length(2);
      expect(warmupSets[0].completedReps).to.equal(10);
      expect(warmupSets[0].completedWeight).to.deep.equal(Weight_build(95, "lb"));
    });

    it("round-trips unilateral sets", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [
              buildSet({
                completedReps: 10,
                completedRepsLeft: 8,
                completedWeight: Weight_build(50, "lb"),
                isUnilateral: true,
                isCompleted: true,
              }),
            ],
          }),
        ],
      });

      const serialized = LiftohistorySerializer_serialize(record, settings);
      const deserialized = LiftohistoryDeserializer_deserialize(serialized, settings);
      expect(deserialized.success).to.be.true;
      if (!deserialized.success) {
        return;
      }

      const set = deserialized.data.historyRecords[0].entries[0].sets[0];
      expect(set.completedReps).to.equal(10);
      expect(set.completedRepsLeft).to.equal(8);
      expect(set.isUnilateral).to.equal(true);
    });

    it("round-trips AMRAP and RPE", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [
              buildSet({
                completedReps: 12,
                completedWeight: Weight_build(100, "lb"),
                completedRpe: 9,
                isAmrap: true,
                reps: 5,
                weight: Weight_build(100, "lb"),
                rpe: 8,
                logRpe: true,
                isCompleted: true,
              }),
            ],
          }),
        ],
      });

      const serialized = LiftohistorySerializer_serialize(record, settings);
      const deserialized = LiftohistoryDeserializer_deserialize(serialized, settings);
      expect(deserialized.success).to.be.true;
      if (!deserialized.success) {
        return;
      }

      const set = deserialized.data.historyRecords[0].entries[0].sets[0];
      expect(set.completedReps).to.equal(12);
      expect(set.completedRpe).to.equal(9);
      expect(set.isAmrap).to.equal(true);
      expect(set.reps).to.equal(5);
      expect(set.rpe).to.equal(8);
      expect(set.logRpe).to.equal(true);
    });

    it("round-trips workout and exercise notes", () => {
      const settings = buildSettings();
      const record = buildRecord({
        notes: "Great workout",
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [buildSet({ completedReps: 5, completedWeight: Weight_build(100, "lb"), isCompleted: true })],
            notes: "Felt good",
          }),
        ],
      });

      const serialized = LiftohistorySerializer_serialize(record, settings);
      const deserialized = LiftohistoryDeserializer_deserialize(serialized, settings);
      expect(deserialized.success).to.be.true;
      if (!deserialized.success) {
        return;
      }

      expect(deserialized.data.historyRecords[0].notes).to.equal("Great workout");
      expect(deserialized.data.historyRecords[0].entries[0].notes).to.equal("Felt good");
    });

    it("round-trips rep range and timer", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [
              buildSet({
                completedReps: 10,
                completedWeight: Weight_build(100, "lb"),
                reps: 12,
                minReps: 8,
                weight: Weight_build(100, "lb"),
                timer: 90,
                isCompleted: true,
              }),
            ],
          }),
        ],
      });

      const serialized = LiftohistorySerializer_serialize(record, settings);
      const deserialized = LiftohistoryDeserializer_deserialize(serialized, settings);
      expect(deserialized.success).to.be.true;
      if (!deserialized.success) {
        return;
      }

      const set = deserialized.data.historyRecords[0].entries[0].sets[0];
      expect(set.minReps).to.equal(8);
      expect(set.reps).to.equal(12);
      expect(set.timer).to.equal(90);
    });

    it("round-trips askWeight", () => {
      const settings = buildSettings();
      const record = buildRecord({
        entries: [
          buildEntry({
            exercise: { id: "squat", equipment: "barbell" },
            sets: [
              buildSet({
                completedReps: 5,
                completedWeight: Weight_build(100, "lb"),
                reps: 5,
                weight: Weight_build(100, "lb"),
                askWeight: true,
                isCompleted: true,
              }),
            ],
          }),
        ],
      });

      const serialized = LiftohistorySerializer_serialize(record, settings);
      const deserialized = LiftohistoryDeserializer_deserialize(serialized, settings);
      expect(deserialized.success).to.be.true;
      if (!deserialized.success) {
        return;
      }

      const set = deserialized.data.historyRecords[0].entries[0].sets[0];
      expect(set.askWeight).to.equal(true);
      expect(set.weight).to.deep.equal(Weight_build(100, "lb"));
    });
  });
});
