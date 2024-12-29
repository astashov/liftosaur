import { lb } from "lens-shmens";
import React, { JSX } from "react";
import { memo } from "react";
import { useState } from "react";
import { ExerciseImage } from "../../../components/exerciseImage";
import { IProgramMode, Program } from "../../../models/program";
import { ProgramExercise } from "../../../models/programExercise";
import { Progression } from "../../../models/progression";
import { IDayData, IProgram, IProgramExercise, ISettings, ISubscription } from "../../../types";
import { DeloadView } from "./programDetailsDeload";
import { FinishDayExprView } from "./programDetailsFinishDayExpr";
import { Playground } from "./programDetailsPlayground";
import { ProgressionView } from "./programDetailsProgression";
import { RepsAndWeight } from "./programDetailsValues";
import { IProgramDetailsDispatch, IProgramDetailsState } from "./types";

interface IProgramDetailsExerciseProps {
  programId: string;
  programExercise: IProgramExercise;
  programMode: IProgramMode;
  program: IProgram;
  programExerciseIndex: number;
  subscription: ISubscription;
  dayData: IDayData;
  settings: ISettings;
  shouldShowAllFormulas: boolean;
  shouldShowAllScripts: boolean;
  dispatch: IProgramDetailsDispatch;
}

type IProgramDetailsExerciseMode = "details" | "playground";

export const ProgramDetailsExercise = memo(
  (props: IProgramDetailsExerciseProps): JSX.Element => {
    const { programExercise, dayData, settings, programExerciseIndex } = props;
    const allProgramExercises = props.program.exercises;
    const state = ProgramExercise.getState(programExercise, allProgramExercises);
    const variationIndex = Program.nextVariationIndex(programExercise, allProgramExercises, state, dayData, settings);
    const variation = ProgramExercise.getVariations(programExercise, allProgramExercises)[variationIndex];
    const finishDayScript = ProgramExercise.getFinishDayScript(programExercise, allProgramExercises);
    const progression = Progression.getProgression(finishDayScript);
    const deload = Progression.getDeload(finishDayScript);

    const [mode, setMode] = useState<IProgramDetailsExerciseMode>("details");

    return (
      <li className={`${programExerciseIndex !== 0 ? "pt-5 mt-5 border-t border-gray-200" : ""}`}>
        <div className={`program-details-exercise flex w-full is-${mode}`}>
          <div className="pt-2 pr-2 text-4xl text-gray-400 program-details-exercise-number">
            {programExerciseIndex + 1}
          </div>
          <div className="pr-4 program-details-exercise-image" style={{ width: "6.5em" }}>
            <ExerciseImage
              settings={props.settings}
              exerciseType={programExercise.exerciseType}
              className="w-full"
              size="small"
            />
          </div>
          <div className="flex-1">
            <div className="text-right program-details-exercise-switch">
              <button
                onClick={() => setMode(mode === "details" ? "playground" : "details")}
                className={`text-sm text-blue-700 underline nm-program-details-exercise-${
                  mode === "details" ? "playground" : "details"
                }`}
              >
                {mode === "details" ? "Playground" : "Details"}
              </button>
            </div>
            <div className="flex">
              <div className="flex-1 pr-2 program-details-exercise-content">
                <h3 className="text-lg font-bold">{programExercise.name}</h3>
                <div className="pt-2">
                  <RepsAndWeight
                    sets={variation.sets}
                    programExercise={programExercise}
                    allProgramExercises={allProgramExercises}
                    dayData={dayData}
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
                  programMode={props.programMode}
                  programId={props.programId}
                  subscription={props.subscription}
                  programExercise={programExercise}
                  program={props.program}
                  variationIndex={variationIndex}
                  settings={settings}
                  dayData={dayData}
                  onProgramExerciseUpdate={(newProgramExercise) => {
                    props.dispatch(
                      lb<IProgramDetailsState>()
                        .p("programs")
                        .findBy("id", props.programId)
                        .p("exercises")
                        .findBy("id", newProgramExercise.id)
                        .record(newProgramExercise)
                    );
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </li>
    );
  }
);
