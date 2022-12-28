import { h, JSX } from "preact";
import { memo } from "preact/compat";
import { useState } from "preact/hooks";
import { ExerciseImage } from "../../../components/exerciseImage";
import { Program } from "../../../models/program";
import { ProgramExercise } from "../../../models/programExercise";
import { Progression } from "../../../models/progression";
import { IProgramExercise, ISettings } from "../../../types";
import { DeloadView } from "./programDetailsDeload";
import { FinishDayExprView } from "./programDetailsFinishDayExpr";
import { Playground } from "./programDetailsPlayground";
import { ProgressionView } from "./programDetailsProgression";
import { Reps, Weights } from "./programDetailsValues";
import { IProgramDetailsDispatch } from "./types";

interface IProgramDetailsExerciseProps {
  programId: string;
  programExercise: IProgramExercise;
  allProgramExercises: IProgramExercise[];
  programExerciseIndex: number;
  dayIndex: number;
  settings: ISettings;
  shouldShowAllFormulas: boolean;
  shouldShowAllScripts: boolean;
  dispatch: IProgramDetailsDispatch;
}

type IProgramDetailsExerciseMode = "details" | "playground";

export const ProgramDetailsExercise = memo(
  (props: IProgramDetailsExerciseProps): JSX.Element => {
    const { programExercise, dayIndex, settings, programExerciseIndex, allProgramExercises } = props;
    const variationIndex = Program.nextVariationIndex(programExercise, allProgramExercises, dayIndex + 1, settings);
    const variation = ProgramExercise.getVariations(programExercise, allProgramExercises)[variationIndex];
    const finishDayScript = ProgramExercise.getFinishDayScript(programExercise, allProgramExercises)[variationIndex];
    const progression = Progression.getProgression(finishDayScript);
    const deload = Progression.getDeload(finishDayScript);

    const [mode, setMode] = useState<IProgramDetailsExerciseMode>("details");

    return (
      <li className={`${programExerciseIndex !== 0 ? "pt-5 mt-5 border-t border-gray-200" : ""}`}>
        <div className={`program-details-exercise flex w-full is-${mode}`}>
          <div className="pt-2 pr-2 text-4xl text-gray-400 program-details-exercise-number">
            {programExerciseIndex + 1}
          </div>
          <div className="pr-4 program-details-exercise-image" style={{ maxWidth: "6.5em" }}>
            <ExerciseImage exerciseType={programExercise.exerciseType} customExercises={{}} size="small" />
          </div>
          <div className="flex-1">
            <div className="text-right program-details-exercise-switch">
              <button
                onClick={() => setMode(mode === "details" ? "playground" : "details")}
                className="text-sm text-blue-700 underline"
              >
                {mode === "details" ? "Playground" : "Details"}
              </button>
            </div>
            <div className="flex">
              <div className="flex-1 pr-2 program-details-exercise-content">
                <h3 className="font-bold">{programExercise.name}</h3>
                <div className="pt-2">
                  <Reps
                    sets={variation.sets}
                    programExercise={programExercise}
                    allProgramExercises={allProgramExercises}
                    dayIndex={dayIndex}
                    settings={settings}
                    shouldShowAllFormulas={props.shouldShowAllFormulas}
                  />
                </div>
                <div className="pt-2">
                  <Weights
                    sets={variation.sets}
                    programExercise={programExercise}
                    allProgramExercises={allProgramExercises}
                    dayIndex={dayIndex}
                    settings={settings}
                    shouldShowAllFormulas={props.shouldShowAllFormulas}
                  />
                </div>
                <div>{progression && <ProgressionView progression={progression} />}</div>
                <div>{deload && <DeloadView deload={deload} />}</div>
                <div>
                  <FinishDayExprView
                    finishDayExpr={ProgramExercise.getFinishDayScript(programExercise, allProgramExercises)}
                    shouldShowAllScripts={props.shouldShowAllScripts}
                  />
                </div>
              </div>
              <div className="flex-1 program-details-exercise-playground">
                <Playground
                  programId={props.programId}
                  programExercise={programExercise}
                  allProgramExercises={allProgramExercises}
                  variationIndex={variationIndex}
                  settings={settings}
                  day={dayIndex + 1}
                  dispatch={props.dispatch}
                />
              </div>
            </div>
          </div>
        </div>
      </li>
    );
  }
);
