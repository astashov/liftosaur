import { h, JSX, Fragment } from "preact";
import { useState } from "preact/hooks";
import { ExerciseImage } from "../../../components/exerciseImage";
import { HistoryRecordSetsView } from "../../../components/historyRecordSets";
import { Input } from "../../../components/input";
import { Scroller } from "../../../components/scroller";
import { equipmentName, Exercise } from "../../../models/exercise";
import { IEvaluatedProgram, Program } from "../../../models/program";
import { IExerciseType, ISettings, IWeight } from "../../../types";
import { ProgramDetailsExerciseExampleGraph } from "./programDetailsExerciseExampleGraph";
import { Weight } from "../../../models/weight";
import { PP } from "../../../models/pp";
import { CollectionUtils } from "../../../utils/collection";

export interface IProgramDetailsExerciseExampleProps {
  settings: ISettings;
  program: IEvaluatedProgram;
  exerciseType: IExerciseType;
  programExerciseKey: string;
  weekRange?: [number, number];
}

export function ProgramDetailsExerciseExample(props: IProgramDetailsExerciseExampleProps): JSX.Element {
  const exerciseType = props.exerciseType;
  const exercise = Exercise.get(exerciseType, props.settings.exercises);
  let dayInWeek: number | undefined;
  const [weekFrom, weekTo] = props.weekRange ?? [1, props.program.weeks.length];
  const weeks = props.program.weeks.slice(weekFrom - 1, weekTo);
  PP.iterate2(weeks, (ex, weekIndex, dayInWeekIndex, dayIndex) => {
    if (ex.key === props.programExerciseKey) {
      dayInWeek = dayInWeekIndex + 1;
      return true;
    }
    return false;
  });
  dayInWeek = dayInWeek ?? 1;

  const [onerm, setOnerm] = useState<IWeight>(Exercise.onerm(props.exerciseType, props.settings));
  const settings = {
    ...props.settings,
    exerciseData: { ...props.settings.exerciseData, [Exercise.toKey(props.exerciseType)]: { rm1: onerm } },
  };
  const weekEntries = CollectionUtils.compact(
    weeks.map((week) => {
      const programDay = week.days[(dayInWeek ?? 1) - 1];
      const programExercise = CollectionUtils.findBy(programDay.exercises, "key", props.programExerciseKey);
      if (!programExercise) {
        return undefined;
      }

      return {
        label: week.name,
        entry: Program.nextHistoryEntry(props.program, programDay.dayData, programExercise, settings),
      };
    })
  );

  return (
    <div>
      <div className="mx-auto mt-2">
        <div className="w-48 mx-auto mb-2">
          <Input
            label={`Enter 1RM weight (${onerm.unit})`}
            value={onerm.value}
            changeHandler={(r) => {
              if (r.success) {
                const value = parseFloat(r.data);
                if (!isNaN(value)) {
                  setOnerm(Weight.build(value, props.settings.units));
                }
              }
            }}
          />
        </div>
        <div className="relative flex-1 px-2 mx-auto rounded-lg bg-purplev2-100">
          <div className="items-start block sm:flex sm:items-center">
            <div className="flex pt-2" style={{ minWidth: "4rem", maxWidth: "16rem" }}>
              <div style={{ width: "40px" }} className="box-content px-2 mr-1">
                <ExerciseImage settings={props.settings} className="w-full" exerciseType={exerciseType} size="small" />
              </div>
              <div className="flex-1 ml-auto">
                <div className="flex items-center">
                  <div className="flex-1 mr-1 font-bold">{exercise.name}</div>
                </div>
                {exercise.equipment && (
                  <div className="text-sm text-grayv2-600">{equipmentName(exercise.equipment)}</div>
                )}
              </div>
            </div>
            <Scroller>
              <section className="relative flex items-center mt-1 ml-2">
                {weekEntries.map((week, i) => {
                  return (
                    <>
                      {i !== 0 && <div className="h-12 mr-2 border-l border-grayv2-200" />}
                      <div>
                        <div className="px-2 text-xs text-center whitespace-nowrap text-grayv2-main">{week.label}</div>
                        <div className="flex flex-no-wrap justify-center">
                          <HistoryRecordSetsView sets={week.entry.sets} isNext={true} settings={props.settings} />
                        </div>
                      </div>
                    </>
                  );
                })}
              </section>
            </Scroller>
          </div>
        </div>
        <div className="mb-2">
          <ProgramDetailsExerciseExampleGraph
            weeksData={weekEntries}
            key={onerm.value}
            title="Weight week over week"
            yAxisLabel="Weight"
            color="red"
            getValue={(entry) => entry.sets[0].weight.value}
          />
        </div>
        <div>
          <ProgramDetailsExerciseExampleGraph
            weeksData={weekEntries}
            key={onerm.value}
            title="Volume (reps * weight) week over week"
            yAxisLabel="Volume"
            color="orange"
            getValue={(entry) => entry.sets.reduce((acc, s) => acc + s.reps * s.weight.value, 0)}
          />
        </div>
      </div>
    </div>
  );
}
