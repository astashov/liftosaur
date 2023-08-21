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
import { IconTrash } from "../../../components/icons/iconTrash";
import { IProgramEditorUiSelected } from "../models/types";
import { Program } from "../../../models/program";

interface IProgramContentExerciseProps {
  program: IProgram;
  programExercise: IProgramExercise;
  selected: IProgramEditorUiSelected[];
  settings: ISettings;
  dayIndex?: number;
  handleTouchStart?: (e: TouchEvent | MouseEvent) => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onSelect?: (programExerciseId: string, dayIndex?: number) => void;
}

export function ProgramContentExercise(props: IProgramContentExerciseProps): JSX.Element {
  const { programExercise, program, settings } = props;
  const isUnassigned = props.dayIndex == null;
  const dayIndex = props.dayIndex || 0;
  const dayData = Program.getDayData(program, dayIndex + 1);
  const approxTime = TimeUtils.formatHHMM(
    ProgramExercise.approxTimeMs(dayData, programExercise, program.exercises, settings)
  );
  const reusedProgramExercise = ProgramExercise.getReusedProgramExercise(programExercise, program.exercises);
  const stateVars = ProgramExercise.getState(programExercise, program.exercises);
  const variations = ProgramExercise.getVariations(programExercise, program.exercises);
  const isSelected = props.selected.some((s) => s.dayIndex === props.dayIndex && s.exerciseId === programExercise.id);
  return (
    <div className="relative my-2">
      <div className="absolute text-xs text-grayv2-main" style={{ bottom: "0.5rem", right: "0.5rem" }}>
        id: {programExercise.id}
      </div>
      <div
        className="flex items-center px-4 py-1 rounded-lg bg-purplev2-100"
        style={{ border: isSelected ? "1px solid #8356F6" : "1px solid rgb(125 103 189 / 15%)", minHeight: "5rem" }}
        onClick={() => props.onSelect?.(programExercise.id, props.dayIndex)}
      >
        {props.handleTouchStart && (
          <div className="p-2 mr-1 cursor-move" style={{ marginLeft: "-16px", touchAction: "none" }}>
            <span onMouseDown={props.handleTouchStart} onTouchStart={props.handleTouchStart}>
              <IconHandle />
            </span>
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center flex-1">
            <div className="mr-3">
              <ExerciseImage
                settings={props.settings}
                className="w-8"
                exerciseType={programExercise.exerciseType}
                size="small"
              />
            </div>
            <div className="flex-1 mr-2">{programExercise!!.name}</div>
            <div className="flex self-start" style={{ marginRight: "-0.5rem" }}>
              <div className="p-2">
                <IconWatch className="mb-1 align-middle" />
                <span className="pl-1 align-middle">{approxTime} h</span>
              </div>
              {props.onCopy && (
                <button title="Clone Exercise" className="p-2" onClick={props.onCopy}>
                  <IconDuplicate2 />
                </button>
              )}
              {props.onEdit && (
                <button title="Edit Exercise" onClick={props.onEdit} className="p-2">
                  <IconEditSquare />
                </button>
              )}
              {props.onDelete && (
                <button
                  title={isUnassigned ? "Delete exercise" : "Remove exercise from day"}
                  className="p-2"
                  onClick={props.onDelete}
                >
                  {isUnassigned ? <IconTrash /> : <IconCloseCircleOutline />}
                </button>
              )}
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
                        dayData={dayData}
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
              {programExercise.timerExpr && (
                <div className="text-xs">
                  Rest Timer: <strong>{programExercise.timerExpr}</strong>
                </div>
              )}
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
