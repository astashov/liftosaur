import { h, JSX } from "preact";
import { memo } from "preact/compat";
import { useState } from "preact/hooks";
import { ExerciseImage } from "../../../components/exerciseImage";
import { Program } from "../../../models/program";
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
    const { programExercise, dayIndex, settings, programExerciseIndex } = props;
    const variationIndex = Program.nextVariationIndex(programExercise, dayIndex + 1, settings);
    const variation = programExercise.variations[variationIndex];
    const progression = Progression.getProgression(programExercise.finishDayExpr);
    const deload = Progression.getDeload(programExercise.finishDayExpr);

    const [mode, setMode] = useState<IProgramDetailsExerciseMode>("details");

    return (
      <li className={`${programExerciseIndex !== 0 ? "pt-5 mt-5 border-t border-gray-200" : ""}`}>
        <div className={`program-details-exercise flex w-full is-${mode}`}>
          <div className="program-details-exercise-number pt-2 pr-2 text-4xl text-gray-400">
            {programExerciseIndex + 1}
          </div>
          <div className="program-details-exercise-image pr-4" style={{ maxWidth: "6.5em" }}>
            <ExerciseImage exerciseType={programExercise.exerciseType} customExercises={{}} size="small" />
          </div>
          <div className="flex-1">
            <div className="program-details-exercise-switch text-right">
              <button
                onClick={() => setMode(mode === "details" ? "playground" : "details")}
                className="text-sm text-blue-700 underline"
              >
                {mode === "details" ? "Playground" : "Details"}
              </button>
            </div>
            <div className="flex">
              <div className="program-details-exercise-content flex-1 pr-2">
                <h3 className="font-bold">{programExercise.name}</h3>
                <div className="pt-2">
                  <Reps
                    sets={variation.sets}
                    programExercise={programExercise}
                    dayIndex={dayIndex}
                    settings={settings}
                    shouldShowAllFormulas={props.shouldShowAllFormulas}
                  />
                </div>
                <div className="pt-2">
                  <Weights
                    sets={variation.sets}
                    programExercise={programExercise}
                    dayIndex={dayIndex}
                    settings={settings}
                    shouldShowAllFormulas={props.shouldShowAllFormulas}
                  />
                </div>
                <div>{progression && <ProgressionView progression={progression} />}</div>
                <div>{deload && <DeloadView deload={deload} />}</div>
                <div>
                  <FinishDayExprView
                    finishDayExpr={programExercise.finishDayExpr}
                    shouldShowAllScripts={props.shouldShowAllScripts}
                  />
                </div>
              </div>
              <div className="program-details-exercise-playground flex-1">
                <Playground
                  programId={props.programId}
                  programExercise={programExercise}
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
