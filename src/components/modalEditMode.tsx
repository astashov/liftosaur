import { JSX, h, Fragment } from "preact";
import { Modal } from "./modal";
import { Button } from "./button";
import { ISettings, IUnit, IExerciseType, IProgramState } from "../types";
import { Exercise } from "../models/exercise";
import { IDispatch } from "../ducks/types";
import { IState, updateState } from "../models/state";
import { lb } from "lens-shmens";
import { EditProgram } from "../models/editProgram";
import { ObjectUtils } from "../utils/object";
import { Weight } from "../models/weight";
import { MenuItemEditable } from "./menuItemEditable";
import { IconCalculator } from "./icons/iconCalculator";
import { useState } from "preact/hooks";
import { RepMaxCalculator } from "./repMaxCalculator";
import { StringUtils } from "../utils/string";
import { IWeightChange, ProgramExercise } from "../models/programExercise";
import { IEvaluatedProgram, Program } from "../models/program";
import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import { CollectionUtils } from "../utils/collection";
import { ProgramToPlanner } from "../models/programToPlanner";
import { InputWeight } from "./inputWeight";
import { ExerciseDataSettings } from "./exerciseDataSettings";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";

interface IModalEditModeProps {
  programExerciseId: string;
  program: IEvaluatedProgram;
  day: number;
  entryIndex: number;
  progressId: number;
  settings: ISettings;
  dispatch: IDispatch;
}

export function ModalEditMode(props: IModalEditModeProps): JSX.Element {
  const programExercise = Program.getProgramExercise(props.day, props.program, props.programExerciseId);
  if (programExercise == null || programExercise.exerciseType == null) {
    return <Fragment />;
  }
  const exercise = Exercise.get(programExercise.exerciseType, props.settings.exercises);
  const onClose = (): void => {
    updateState(props.dispatch, [
      lb<IState>().p("progress").pi(props.progressId).pi("ui").p("editModal").record(undefined),
    ]);
  };
  const onSave = (): void => {
    let newEvaluatedProgram = EditProgram.properlyUpdateStateVariableInPlace(props.program, programExercise, newState);
    newEvaluatedProgram = PlannerProgram.replaceWeight(newEvaluatedProgram, programExercise.key, weightChanges);
    const newPlanner = new ProgramToPlanner(newEvaluatedProgram, props.settings).convertToPlanner();
    updateState(props.dispatch, [
      lb<IState>().p("storage").p("programs").findBy("id", props.program.id).p("planner").record(newPlanner),
    ]);
    onClose();
  };
  const hasStateVariables = ObjectUtils.keys(PlannerProgramExercise.getState(programExercise)).length > 0;
  const [newState, setNewState] = useState<Partial<IProgramState>>({});
  const [weightChanges, setWeightChanges] = useState(ProgramExercise.weightChanges(props.program, programExercise.key));
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
            <ExerciseDataSettings
              fullExercise={exercise}
              programExerciseIds={[programExercise.key]}
              settings={props.settings}
              dispatch={props.dispatch}
              show1RM={false}
            />
            {planner && (
              <EditWeights
                weightChanges={weightChanges}
                settings={props.settings}
                exerciseType={programExercise.exerciseType}
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
                <h2 className="mt-4 mb-2 text-lg text-center">Edit state variables</h2>
                <ProgramStateVariables
                  settings={props.settings}
                  newState={newState}
                  programExercise={programExercise}
                  onEditStateVariable={(stateKey, newValue) => {
                    setNewState({
                      ...newState,
                      [stateKey]: Program.stateValue(
                        PlannerProgramExercise.getState(programExercise),
                        stateKey,
                        newValue
                      ),
                    });
                  }}
                  onOpenCalculator={(key, unit) => setShowCalculator({ type: "state", value: [key, unit] })}
                />
              </>
            )}
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
          </>
        ) : (
          <RepMaxCalculator
            backLabel="Back"
            unit={showCalculator.value[1]}
            onSelect={(weightValue) => {
              if (weightValue != null) {
                if (showCalculator.type === "state") {
                  setNewState({
                    ...newState,
                    [showCalculator.value[0]]: Program.stateValue(
                      PlannerProgramExercise.getState(programExercise),
                      showCalculator.value[0],
                      `${weightValue}`
                    ),
                  });
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
  programExercise: IPlannerProgramExercise;
  newState: Partial<IProgramState>;
  onEditStateVariable: (stateKey: string, newValue: string) => void;
  settings: ISettings;
  onOpenCalculator: (stateKey: string, unit: IUnit) => void;
}

function ProgramStateVariables(props: IStateProps): JSX.Element {
  const { programExercise } = props;
  const state = PlannerProgramExercise.getState(programExercise);
  const stateMetadata = PlannerProgramExercise.getStateMetadata(programExercise);

  return (
    <section className="px-4 py-2 bg-purple-100 rounded-2xl">
      {ObjectUtils.keys(state).map((stateKey, i) => {
        const value = props.newState[stateKey] ?? state[stateKey];
        const displayValue = Weight.is(value) || Weight.isPct(value) ? value.value : value;

        return (
          <MenuItemEditable
            name={stateKey}
            isBorderless={i === Object.keys(state).length - 1}
            nextLine={
              stateMetadata?.[stateKey]?.userPrompted ? (
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
  exerciseType?: IExerciseType;
  settings: ISettings;
  onEditWeight: (index: number, weight: number, unit: IUnit | "%") => void;
  onCalculatorOpen: (index: number) => void;
}

function EditWeights(props: IEditWeightsProps): JSX.Element {
  const hasRestWeights = props.weightChanges.some((wc) => !wc.current);
  let previousCurrent: boolean | undefined = undefined;

  return (
    <div>
      <h2 className="mt-4 mb-2 text-lg text-center">Edit program weights</h2>
      {hasRestWeights && <h3 className="mb-1 text-xs leading-none text-grayv2-main">Current Workout</h3>}
      {props.weightChanges.map((weightChange, i) => {
        const component = (
          <>
            {hasRestWeights && previousCurrent != null && previousCurrent !== weightChange.current && (
              <h3 className="mt-3 mb-1 text-xs leading-none text-grayv2-main">Rest of the program</h3>
            )}
            <EditWeight
              weightChange={weightChange}
              exerciseType={props.exerciseType}
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
  exerciseType?: IExerciseType;
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
        data-cy="edit-weight-input"
        settings={props.settings}
        exerciseType={props.exerciseType}
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
