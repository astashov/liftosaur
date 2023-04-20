import { JSX, h, Fragment } from "preact";
import { Modal } from "./modal";
import { Button } from "./button";
import { ISettings, IProgramExercise, IProgram, IProgramStateMetadata } from "../types";
import { Exercise } from "../models/exercise";
import { IDispatch } from "../ducks/types";
import { IState, updateState } from "../models/state";
import { lb } from "lens-shmens";
import { EditProgram } from "../models/editProgram";
import { ObjectUtils } from "../utils/object";
import { Weight } from "../models/weight";
import { MenuItemEditable } from "./menuItemEditable";

interface IModalEditModeProps {
  programExerciseId: string;
  program: IProgram;
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
  return (
    <Modal shouldShowClose={true} onClose={onClose} isFullWidth={true}>
      <div style={{ minWidth: "80%" }} data-cy="modal-edit-mode">
        <h2 className="mb-4 text-xl font-bold text-center">{exercise.name}</h2>
        {hasStateVariables ? (
          <>
            <h2 className="mb-2 text-lg text-center">Edit state variables only</h2>
            <ProgramStateVariables
              programExercise={programExercise}
              stateMetadata={programExercise.stateMetadata}
              onEditStateVariable={(stateKey, newValue) => {
                EditProgram.properlyUpdateStateVariableInPlace(
                  props.dispatch,
                  props.program.id,
                  programExercise,
                  stateKey,
                  newValue
                );
                props.dispatch({ type: "ApplyProgramChangesToProgress" });
              }}
            />
            <div className="mt-4 text-center">
              <Button kind="orange" onClick={() => onClose()} data-cy="modal-edit-mode-save-statvars">
                Done
              </Button>
            </div>
            <h2 className="mt-8 text-lg text-center">Or edit the whole exercise</h2>
          </>
        ) : (
          <h2 className="my-4 text-lg text-center">Edit the exercise</h2>
        )}

        <div className="flex items-center mt-2">
          <div className="flex-1">
            <Button
              kind="purple"
              style={{ minHeight: "3.25rem" }}
              buttonSize="md"
              onClick={() => {
                updateState(props.dispatch, [
                  lb<IState>()
                    .p("progress")
                    .pi(props.progressId)
                    .pi("ui")
                    .p("entryIndexEditMode")
                    .record(props.entryIndex),
                  lb<IState>().p("progress").pi(props.progressId).pi("ui").p("exerciseBottomSheet").record(undefined),
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
          <div className="flex-1">
            <Button
              style={{ minHeight: "3.25rem" }}
              kind="purple"
              buttonSize="md"
              onClick={() => {
                updateState(props.dispatch, [lb<IState>().p("editProgram").record({ id: props.program.id })]);
                EditProgram.editProgramExercise(props.dispatch, programExercise);
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
      </div>
    </Modal>
  );
}

interface IStateProps {
  programExercise: IProgramExercise;
  stateMetadata?: IProgramStateMetadata;
  onEditStateVariable: (stateKey: string, newValue: string) => void;
}

function ProgramStateVariables(props: IStateProps): JSX.Element {
  const { programExercise } = props;
  const reuseLogicId = programExercise.reuseLogic?.selected;
  const state = reuseLogicId ? programExercise.reuseLogic?.states[reuseLogicId]! : programExercise.state;

  return (
    <section className="px-4 py-2 bg-purple-100 rounded-2xl">
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
