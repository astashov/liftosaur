import { h, JSX } from "preact";
import { useState } from "preact/hooks";
import { ExerciseImage } from "../../../components/exerciseImage";
import { HistoryRecordSetsView } from "../../../components/historyRecordSets";
import { Input } from "../../../components/input";
import { ScrollableTabs } from "../../../components/scrollableTabs";
import { equipmentName, Exercise } from "../../../models/exercise";
import { Program } from "../../../models/program";
import { IProgram, IProgramExercise, ISettings, IWeight } from "../../../types";
import { ObjectUtils } from "../../../utils/object";
import { IPlaygroundDetailsWeekSetup } from "./programDetailsWeekSetup";

export interface IProgramDetailsExerciseExampleProps {
  settings: ISettings;
  program: IProgram;
  programExercise: IProgramExercise;
  weekSetup: IPlaygroundDetailsWeekSetup[];
  weightInputs: { label: string; key: string }[];
}

export function ProgramDetailsExerciseExample(props: IProgramDetailsExerciseExampleProps): JSX.Element {
  const programExercise = ObjectUtils.clone(props.programExercise);
  const exerciseType = programExercise.exerciseType;
  const exercise = Exercise.get(exerciseType, props.settings.exercises);
  const day = props.program.days.findIndex((d) => d.exercises.some((e) => e.id === programExercise.id));

  const [stateWeights, setStateWeights] = useState<Record<string, IWeight>>(
    props.weightInputs.reduce<Record<string, IWeight>>((acc, input) => {
      acc[input.key] = programExercise.state[input.key] as IWeight;
      return acc;
    }, {})
  );
  console.log(stateWeights);
  for (const key of ObjectUtils.keys(stateWeights)) {
    programExercise.state[key] = stateWeights[key];
  }

  return (
    <div>
      <ScrollableTabs
        tabs={props.weekSetup.map((week) => {
          const staticState = week.days[day].states[props.programExercise.id];
          const entry = Program.programExerciseToHistoryEntry(
            programExercise,
            props.program.exercises,
            day + 1,
            props.settings,
            staticState
          );
          return [
            week.name,
            <div
              className="flex flex-col items-center justify-center mx-auto mt-2 sm:flex-row"
              style={{ gap: "1rem", maxWidth: "36rem" }}
            >
              <div className="w-48">
                {props.weightInputs.map((input) => {
                  return (
                    <Input
                      key={input.key}
                      label={input.label}
                      value={stateWeights[input.key].value}
                      changeHandler={(r) => {
                        if (r.success) {
                          const value = parseFloat(r.data);
                          if (!isNaN(value)) {
                            setStateWeights({ ...stateWeights, [input.key]: { value, unit: props.settings.units } });
                          }
                        }
                      }}
                    />
                  );
                })}
              </div>
              <div className="relative flex-1 px-2 mx-auto rounded-lg bg-purplev2-100">
                <div className="flex items-center">
                  <div style={{ width: "40px" }} className="box-content px-2 mr-1">
                    <ExerciseImage className="w-full" exerciseType={exerciseType} size="small" />
                  </div>
                  <div className="flex-1 ml-auto" style={{ minWidth: "6rem" }}>
                    <div className="flex items-center">
                      <div className="flex-1 mr-1 font-bold">{exercise.name}</div>
                    </div>
                    {exercise.equipment && (
                      <div className="text-sm text-grayv2-600">{equipmentName(exercise.equipment)}</div>
                    )}
                  </div>
                  <section className="flex flex-wrap mt-1 ml-2">
                    <HistoryRecordSetsView sets={entry.sets} isNext={true} unit={props.settings.units} />
                  </section>
                </div>
              </div>
            </div>,
          ];
        })}
      />
    </div>
  );
}
