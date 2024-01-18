import { JSX, h, Fragment } from "preact";
import { Modal } from "./modal";
import { Button } from "./button";
import { ISettings, IProgramExercise, IProgram, IProgramStateMetadata, IUnit } from "../types";
import { Exercise } from "../models/exercise";
import { IDispatch } from "../ducks/types";
import { IState, updateState } from "../models/state";
import { lb } from "lens-shmens";
import { EditProgram } from "../models/editProgram";
import { ObjectUtils } from "../utils/object";
import { Weight } from "../models/weight";
import { MenuItemEditable } from "./menuItemEditable";
import { EditProgramConvertStateVariables } from "./editProgram/editProgramConvertStateVariables";
import { IconCalculator } from "./icons/iconCalculator";
import { useState } from "preact/hooks";
import { RepMaxCalculator } from "./repMaxCalculator";
import { StringUtils } from "../utils/string";
import { ExerciseRM } from "./exerciseRm";
import { ProgramExercise } from "../models/programExercise";
import { Program } from "../models/program";

interface IModalEditModeProps {
  programExerciseId: string;
  program: IProgram;
  day: number;
  entryIndex: number;
  progressId: number;
  settings: ISettings;
  dispatch: IDispatch;
}

export function ModalEditMode(props: IModalEditModeProps): JSX.Element {
  const programExercise = props.program.exercises.filter((e) => e.id === props.programExerciseId)[0];
  const exercise = Exercise.get(programExercise.exerciseType, props.settings.exercises);
  const onClose = (): void => {
    updateState(props.dispatch, [
      lb<IState>().p("progress").pi(props.progressId).pi("ui").p("editModal").record(undefined),
    ]);
  };
  const hasStateVariables = ObjectUtils.keys(programExercise.state).length > 0;
  const [showCalculator, setShowCalculator] = useState<[string, IUnit] | undefined>(undefined);
  return (
    <Modal shouldShowClose={true} onClose={onClose} isFullWidth={true}>
      <div style={{ minWidth: "80%" }} data-cy="modal-edit-mode">
        {!showCalculator ? (
          <>
            <h2 className="mb-4 text-xl font-bold text-center">{exercise.name}</h2>
            {ProgramExercise.isUsingVariable(programExercise, "rm1") && (
              <div className="my-2">
                <ExerciseRM
                  exercise={exercise}
                  rmKey="rm1"
                  name="1 Rep Max"
                  exerciseData={props.settings.exerciseData}
                  units={props.settings.units}
                  onEditVariable={(value) => {
                    updateState(props.dispatch, [
                      lb<IState>()
                        .p("storage")
                        .p("settings")
                        .p("exerciseData")
                        .recordModify((data) => {
                          const k = Exercise.toKey(exercise);
                          return { ...data, [k]: { ...data[k], rm1: Weight.build(value, props.settings.units) } };
                        }),
                    ]);
                  }}
                />
              </div>
            )}
            {hasStateVariables ? (
              <>
                <h2 className="mb-2 text-lg text-center">Edit state variables</h2>
                <ProgramStateVariables
                  settings={props.settings}
                  programExercise={programExercise}
                  stateMetadata={programExercise.stateMetadata}
                  onChangeStateVariableUnit={() => {
                    EditProgram.switchStateVariablesToUnitInPlace(
                      props.dispatch,
                      props.program.id,
                      programExercise,
                      props.settings
                    );
                  }}
                  onEditStateVariable={(stateKey, newValue) => {
                    EditProgram.properlyUpdateStateVariableInPlace(
                      props.dispatch,
                      props.program.id,
                      programExercise,
                      stateKey,
                      newValue
                    );
                  }}
                  onOpenCalculator={(key, unit) => setShowCalculator([key, unit])}
                />
                <div className="mt-4 text-center">
                  <Button
                    name="edit-mode-stave-statvars"
                    kind="orange"
                    onClick={() => onClose()}
                    data-cy="modal-edit-mode-save-statvars"
                  >
                    Done
                  </Button>
                </div>
                <h2 className="mt-8 text-lg text-center">Or edit the whole exercise</h2>
              </>
            ) : (
              <h2 className="my-4 text-lg text-center">Edit the exercise</h2>
            )}

            <div className="flex items-center mt-2">
              <div className="flex-1 text-center">
                <Button
                  name="edit-mode-this-workout"
                  kind="purple"
                  style={{ minHeight: "3.25rem", width: "7rem" }}
                  buttonSize="md"
                  onClick={() => {
                    updateState(props.dispatch, [
                      lb<IState>()
                        .p("progress")
                        .pi(props.progressId)
                        .pi("ui")
                        .p("entryIndexEditMode")
                        .record(props.entryIndex),
                      lb<IState>()
                        .p("progress")
                        .pi(props.progressId)
                        .pi("ui")
                        .p("exerciseBottomSheet")
                        .record(undefined),
                    ]);
                    onClose();
                  }}
                  data-cy="modal-edit-mode-this-workout"
                >
                  Only in this workout
                </Button>
              </div>
              <div className="flex items-center mx-2 font-bold">
                <div>or</div>
              </div>
              <div className="flex-1 text-center">
                <Button
                  name="edit-mode-in-a-program"
                  style={{ minHeight: "3.25rem", width: "7rem" }}
                  kind="purple"
                  buttonSize="md"
                  onClick={() => {
                    if (props.program.planner) {
                      const dayData = Program.getDayData(props.program, props.day);
                      EditProgram.initializePlanner(props.dispatch, props.program.planner, dayData);
                      Program.editAction(props.dispatch, props.program.id);
                    } else {
                      updateState(props.dispatch, [lb<IState>().p("editProgram").record({ id: props.program.id })]);
                      EditProgram.editProgramExercise(props.dispatch, programExercise);
                    }
                    onClose();
                  }}
                  data-cy="modal-edit-mode-program"
                >
                  In a program
                </Button>
              </div>
            </div>
            <div className="flex">
              <div className="flex-1"></div>
              <div className="invisible mx-2">or</div>
              <div className="flex-1 text-center">
                <div className="mx-auto mt-1 text-xs text-grayv2-main" style={{ maxWidth: "12rem" }}>
                  So it will apply to <strong>this workout</strong> and <strong>all future workouts</strong>
                </div>
              </div>
            </div>
          </>
        ) : (
          <RepMaxCalculator
            backLabel="Back"
            unit={showCalculator[1]}
            onSelect={(weightValue) => {
              if (weightValue != null) {
                EditProgram.properlyUpdateStateVariableInPlace(
                  props.dispatch,
                  props.program.id,
                  programExercise,
                  showCalculator[0],
                  `${weightValue}`
                );
              }
              setShowCalculator(undefined);
            }}
          />
        )}
      </div>
    </Modal>
  );
}

interface IStateProps {
  programExercise: IProgramExercise;
  stateMetadata?: IProgramStateMetadata;
  onEditStateVariable: (stateKey: string, newValue: string) => void;
  settings: ISettings;
  onOpenCalculator: (stateKey: string, unit: IUnit) => void;
  onChangeStateVariableUnit: () => void;
}

function ProgramStateVariables(props: IStateProps): JSX.Element {
  const { programExercise } = props;
  const reuseLogicId = programExercise.reuseLogic?.selected;
  const state = reuseLogicId ? programExercise.reuseLogic?.states[reuseLogicId]! : programExercise.state;

  return (
    <section className="px-4 py-2 bg-purple-100 rounded-2xl">
      <EditProgramConvertStateVariables
        settings={props.settings}
        programExercise={programExercise}
        onConvert={props.onChangeStateVariableUnit}
      />
      {ObjectUtils.keys(state).map((stateKey, i) => {
        const value = state[stateKey];
        const displayValue = Weight.is(value) ? value.value : value;

        return (
          <MenuItemEditable
            name={stateKey}
            isBorderless={i === Object.keys(state).length - 1}
            nextLine={
              props.stateMetadata?.[stateKey]?.userPrompted ? (
                <div style={{ marginTop: "-0.75rem" }} className="mb-1 text-xs text-grayv2-main">
                  User Prompted
                </div>
              ) : undefined
            }
            isNameBold={true}
            type="number"
            value={displayValue.toString()}
            valueUnits={Weight.is(value) ? value.unit : undefined}
            after={
              Weight.is(value) ? (
                <button
                  data-cy={`state-${StringUtils.dashcase(stateKey)}-calculator`}
                  className="p-2 ml-2 nm-rm-calculator"
                  style={{ marginRight: "-0.25rem" }}
                  onClick={() => props.onOpenCalculator(stateKey, value.unit)}
                >
                  <IconCalculator size={16} color="#607284" />
                </button>
              ) : (
                <></>
              )
            }
            hasClear={false}
            onChange={(newValue) => {
              if (newValue) {
                props.onEditStateVariable(stateKey, newValue);
              }
            }}
          />
        );
      })}
    </section>
  );
}
