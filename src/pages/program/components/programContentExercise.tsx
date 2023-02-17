import { h, JSX, Fragment } from "preact";
import { ExerciseImage } from "../../../components/exerciseImage";
import { IconCloseCircleOutline } from "../../../components/icons/iconCloseCircleOutline";
import { IconDuplicate2 } from "../../../components/icons/iconDuplicate2";
import { IconEditSquare } from "../../../components/icons/iconEditSquare";
import { IconHandle } from "../../../components/icons/iconHandle";
import { IconWatch } from "../../../components/icons/iconWatch";
import { ProgramExercise } from "../../../models/programExercise";
import { Weight } from "../../../models/weight";
import { IProgram, IProgramExercise, IProgramState, ISettings } from "../../../types";
import { ObjectUtils } from "../../../utils/object";
import { TimeUtils } from "../../../utils/time";
import { RepsAndWeight } from "../../programs/programDetails/programDetailsValues";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IProgramEditorState } from "../models/types";
import { lb } from "lens-shmens";

interface IProgramContentExerciseProps {
  program: IProgram;
  programExercise: IProgramExercise;
  settings: ISettings;
  dayIndex: number;
  handleTouchStart: (e: TouchEvent | MouseEvent) => void;
  dispatch: ILensDispatch<IProgramEditorState>;
}

export function ProgramContentExercise(props: IProgramContentExerciseProps): JSX.Element {
  const { programExercise, program, settings, dayIndex } = props;
  const approxTime = TimeUtils.formatHHMM(
    ProgramExercise.approxTimeMs(dayIndex, programExercise, program.exercises, settings)
  );
  const reusedProgramExercise = ProgramExercise.getReusedProgramExercise(programExercise, program.exercises);
  const stateVars = ProgramExercise.getState(programExercise, program.exercises);
  const variations = ProgramExercise.getVariations(programExercise, program.exercises);
  return (
    <div className="relative py-2">
      <div className="absolute text-xs text-grayv2-main" style={{ bottom: "0.5rem", right: "0.5rem" }}>
        id: {programExercise.id}
      </div>
      <div
        className="flex items-center px-4 rounded-lg bg-purplev2-100"
        style={{ border: "1px solid rgb(125 103 189 / 15%)" }}
      >
        <div className="p-2 mr-1 cursor-move" style={{ marginLeft: "-16px", touchAction: "none" }}>
          <span onMouseDown={props.handleTouchStart} onTouchStart={props.handleTouchStart}>
            <IconHandle />
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center flex-1">
            <div className="mr-3">
              <ExerciseImage
                className="w-8"
                exerciseType={programExercise.exerciseType}
                size="small"
                customExercises={settings.exercises}
              />
            </div>
            <div className="flex-1 mr-2">{programExercise!!.name}</div>
            <div className="flex self-start">
              <div className="p-2">
                <IconWatch className="mb-1 align-middle" />
                <span className="pl-1 align-middle">{approxTime} h</span>
              </div>
              <button className="p-2">
                <IconDuplicate2 />
              </button>
              <button
                onClick={() => {
                  props.dispatch(
                    lb<IProgramEditorState>()
                      .p("editExercises")
                      .p(programExercise.id)
                      .record(ObjectUtils.clone(programExercise))
                  );
                }}
                className="p-2"
              >
                <IconEditSquare />
              </button>
              <button className="p-2">
                <IconCloseCircleOutline />
              </button>
            </div>
          </div>
          <div className="flex items-center">
            <div>
              {variations.map((variation, variationIndex) => {
                return (
                  <div className={`${variationIndex > 1 ? "pt-2" : ""}`}>
                    {variations.length > 1 && (
                      <div className="text-xs text-grayv2-main" style={{ marginBottom: "-4px" }}>
                        Variation {variationIndex + 1}
                      </div>
                    )}
                    <div>
                      <RepsAndWeight
                        sets={variation.sets}
                        programExercise={programExercise}
                        allProgramExercises={program.exercises}
                        dayIndex={dayIndex}
                        settings={settings}
                        shouldShowAllFormulas={false}
                        forceShowFormula={false}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex-1 ml-4 text-sm">
              <div>
                <StateVars stateVars={stateVars} />
              </div>
              {reusedProgramExercise && (
                <div className="text-grayv2-main">Reused logic from {reusedProgramExercise.name}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StateVars(props: { stateVars: IProgramState }): JSX.Element {
  return (
    <>
      {ObjectUtils.keys(props.stateVars).map((key, i) => {
        const value = props.stateVars[key];
        return (
          <>
            {i !== 0 ? ", " : ""}
            <span>
              <strong>{key}</strong>: {typeof value === "number" ? value : Weight.display(value)}
            </span>
          </>
        );
      })}
    </>
  );
}
