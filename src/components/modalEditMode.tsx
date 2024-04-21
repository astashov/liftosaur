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
import { IWeightChange, ProgramExercise } from "../models/programExercise";
import { Program } from "../models/program";
import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import { CollectionUtils } from "../utils/collection";
import { ProgramToPlanner } from "../models/programToPlanner";
import { InputWeight } from "./inputWeight";

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
  const onSave = (): void => {
    ObjectUtils.entries(newState).forEach(([stateKey, newValue]) => {
      EditProgram.properlyUpdateStateVariableInPlace(
        props.dispatch,
        props.program.id,
        programExercise,
        stateKey,
        newValue
      );
    });
    if (planner != null) {
      const newProgramExercise = PlannerProgram.replaceWeight(programExercise, weightChanges);
      if (programExercise !== newProgramExercise) {
        const newProgram = {
          ...program,
          exercises: CollectionUtils.setBy(program.exercises, "id", programExercise.id, newProgramExercise),
        };
        const newPlanner = new ProgramToPlanner(newProgram, planner, props.settings, {}, {}).convertToPlanner();
        newProgram.planner = newPlanner;
        updateState(props.dispatch, [
          lb<IState>()
            .p("storage")
            .p("programs")
            .recordModify((programs) => {
              return CollectionUtils.setBy(programs, "id", program.id, newProgram);
            }),
        ]);
      }
    }
    onClose();
  };
  const hasStateVariables = ObjectUtils.keys(programExercise.state).length > 0;
  const [newState, setNewState] = useState<Record<string, string>>({});
  const dayData = Program.getDayData(props.program, props.day);
  const [weightChanges, setWeightChanges] = useState(
    ProgramExercise.weightChanges(dayData, programExercise, props.program.exercises, props.settings)
  );
  const [showCalculator, setShowCalculator] = useState<
    { type: "state"; value: [string, IUnit] } | { type: "weight"; value: [number, IUnit] } | undefined
  >(undefined);
  const program = props.program;
  const planner = program.planner;
  return (
    <Modal shouldShowClose={true} onClose={onClose} isFullWidth={true}>
      <div style={{ minWidth: "80%" }} data-cy="modal-edit-mode">
        {!showCalculator ? (
          <>
            <h2 className="mb-4 text-xl font-bold text-center">{exercise.name}</h2>
            {(props.program.planner || ProgramExercise.isUsingVariable(programExercise, "rm1")) && (
              <div className="my-2">
                <ExerciseRM
                  exercise={exercise}
                  rmKey="rm1"
                  name="1 Rep Max"
                  settings={props.settings}
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
            {planner && (
              <EditWeights
                weightChanges={weightChanges}
                settings={props.settings}
                equipment={programExercise.exerciseType.equipment}
                onCalculatorOpen={(index) => {
                  const unit = weightChanges[index].weight.unit;
                  if (unit !== "%") {
                    setShowCalculator({ type: "weight", value: [index, unit] });
                  }
                }}
                onEditWeight={(index, weight, unit) => {
                  const weightChange = weightChanges[index];
                  const newValue: IWeightChange = { ...weightChange, weight: { value: weight, unit } };
                  setWeightChanges(CollectionUtils.setAt(weightChanges, index, newValue));
                }}
              />
            )}
            {hasStateVariables && (
              <>
                <h2 className="mt-2 mb-2 text-lg text-center">Edit state variables</h2>
                <ProgramStateVariables
                  settings={props.settings}
                  newState={newState}
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
                    setNewState({ ...newState, [stateKey]: newValue });
                  }}
                  onOpenCalculator={(key, unit) => setShowCalculator({ type: "state", value: [key, unit] })}
                />
              </>
            )}
            {hasStateVariables || planner ? (
              <>
                <div className="mt-4 text-center">
                  <Button
                    name="edit-mode-stave-statvars"
                    kind="orange"
                    onClick={() => onSave()}
                    data-cy="modal-edit-mode-save-statvars"
                  >
                    Save
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
                      const plannerState = EditProgram.initPlannerState(
                        props.program.id,
                        props.program.planner,
                        dayData
                      );
                      Program.editAction(props.dispatch, props.program.id, plannerState);
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
            unit={showCalculator.value[1]}
            onSelect={(weightValue) => {
              if (weightValue != null) {
                if (showCalculator.type === "state") {
                  EditProgram.properlyUpdateStateVariableInPlace(
                    props.dispatch,
                    props.program.id,
                    programExercise,
                    showCalculator.value[0],
                    `${weightValue}`
                  );
                } else {
                  const weightChange = weightChanges[showCalculator.value[0]];
                  const newValue: IWeightChange = {
                    ...weightChange,
                    weight: { value: weightValue, unit: weightChange.weight.unit },
                  };
                  setWeightChanges(CollectionUtils.setAt(weightChanges, showCalculator.value[0], newValue));
                }
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
  newState: Record<string, string>;
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
        const value = props.newState[stateKey] || state[stateKey];
        const displayValue = Weight.is(value) || Weight.isPct(value) ? value.value : value;

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
            valueUnits={Weight.is(value) || Weight.isPct(value) ? value.unit : undefined}
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

interface IEditWeightsProps {
  weightChanges: IWeightChange[];
  equipment?: string;
  settings: ISettings;
  onEditWeight: (index: number, weight: number, unit: IUnit | "%") => void;
  onCalculatorOpen: (index: number) => void;
}

function EditWeights(props: IEditWeightsProps): JSX.Element {
  const hasRestWeights = props.weightChanges.some((wc) => !wc.current);
  let previousCurrent: boolean | undefined = undefined;

  return (
    <div>
      <h2 className="mt-2 mb-2 text-lg text-center">Edit program weights</h2>
      {hasRestWeights && <h3 className="mb-1 text-xs leading-none text-grayv2-main">Current Workout</h3>}
      {props.weightChanges.map((weightChange, i) => {
        const component = (
          <>
            {hasRestWeights && previousCurrent != null && previousCurrent !== weightChange.current && (
              <h3 className="mt-3 mb-1 text-xs leading-none text-grayv2-main">Rest of the program</h3>
            )}
            <EditWeight
              weightChange={weightChange}
              equipment={props.equipment}
              settings={props.settings}
              onEditWeight={(weight, unit) => props.onEditWeight(i, weight, unit)}
              onCalculatorOpen={() => props.onCalculatorOpen(i)}
            />
          </>
        );
        previousCurrent = weightChange.current;
        return component;
      })}
    </div>
  );
}

interface IEditWeightProps {
  weightChange: IWeightChange;
  equipment?: string;
  settings: ISettings;
  onEditWeight: (weight: number, unit: IUnit | "%") => void;
  onCalculatorOpen: () => void;
}

function EditWeight(props: IEditWeightProps): JSX.Element {
  const { originalWeight, weight } = props.weightChange;

  return (
    <div>
      <InputWeight
        value={weight}
        settings={props.settings}
        equipment={props.equipment}
        onUpdate={(value) => {
          props.onEditWeight(value.value, value.unit);
        }}
      />
      {!Weight.eq(originalWeight, weight) ? (
        <div className="pl-12 mb-2 ml-1 text-xs text-grayv2-main">Was: {Weight.print(originalWeight)}</div>
      ) : (
        <div className="mb-2" />
      )}
    </div>
  );
}
