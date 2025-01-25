import { h, JSX, Fragment } from "preact";
import { useState } from "preact/hooks";
import { ExerciseImage } from "../../../components/exerciseImage";
import { HistoryRecordSetsView } from "../../../components/historyRecordSets";
import { Input } from "../../../components/input";
import { Scroller } from "../../../components/scroller";
import { equipmentName, Exercise } from "../../../models/exercise";
import { Program } from "../../../models/program";
import { IProgram, IProgramExercise, ISettings, IWeight } from "../../../types";
import { ObjectUtils } from "../../../utils/object";
import { ProgramDetailsExerciseExampleGraph } from "./programDetailsExerciseExampleGraph";
import { IProgramPreviewPlaygroundWeekSetup } from "../../../components/preview/programPreviewPlaygroundSetup";
import { Weight } from "../../../models/weight";

export interface IProgramDetailsExerciseExampleProps {
  settings: ISettings;
  program: IProgram;
  programExercise: IProgramExercise;
  weekSetup: IProgramPreviewPlaygroundWeekSetup[];
}

export function ProgramDetailsExerciseExample(props: IProgramDetailsExerciseExampleProps): JSX.Element {
  const programExercise = ObjectUtils.clone(props.programExercise);
  const exerciseType = programExercise.exerciseType;
  const exercise = Exercise.get(exerciseType, props.settings.exercises);
  const day = props.program.days.findIndex((d) => d.exercises.some((e) => e.id === programExercise.id));

  const [onerm, setOnerm] = useState<IWeight>(Exercise.onerm(programExercise.exerciseType, props.settings));
  const settings = {
    ...props.settings,
    exerciseData: { ...props.settings.exerciseData, [Exercise.toKey(programExercise.exerciseType)]: { rm1: onerm } },
  };
  const weeks = props.weekSetup.map((week, weekIndex) => {
    const dayIndex = week.days[day].dayIndex;
    const dayData = Program.getDayData(props.program, dayIndex, props.settings);

    return {
      label: week.name,
      entry: Program.programExerciseToHistoryEntry(programExercise, props.program.exercises, dayData, settings, {}),
    };
  });

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
                {weeks.map((week, i) => {
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
            weeksData={weeks}
            key={onerm.value}
            title="Weight week over week"
            yAxisLabel="Weight"
            color="red"
            getValue={(entry) => entry.sets[0].weight.value}
          />
        </div>
        <div>
          <ProgramDetailsExerciseExampleGraph
            weeksData={weeks}
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
