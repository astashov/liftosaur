import { JSX, h, Fragment } from "preact";
import { Button } from "../button";
import { MenuItemEditable } from "../menuItemEditable";
import { Modal } from "../modal";
import { Weight_is, Weight_isPct } from "../../models/weight";
import { IProgramStateMetadata, ISettings, IExerciseDataValue, IProgramState } from "../../types";
import { ObjectUtils_keys } from "../../utils/object";
import { ExerciseRM } from "../exerciseRm";
import { Exercise_get } from "../../models/exercise";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";

interface IProgramPreviewPlaygroundExerciseEditModalProps {
  programExercise: IPlannerProgramExercise;
  hideVariables?: boolean;
  onClose: () => void;
  onEditStateVariable: (stateKey: string, newValue: string) => void;
  onEditVariable: (variableKey: keyof IExerciseDataValue, newValue: number) => void;
  settings: ISettings;
}

export function ProgramPreviewPlaygroundExerciseEditModal(
  props: IProgramPreviewPlaygroundExerciseEditModalProps
): JSX.Element | null {
  const programExercise = props.programExercise;
  const state = PlannerProgramExercise.getState(props.programExercise);
  const stateMetadata = PlannerProgramExercise.getStateMetadata(props.programExercise);
  const hasStateVariables = ObjectUtils_keys(state).length > 0;
  if (!programExercise.exerciseType) {
    return null;
  }
  const exercise = Exercise_get(programExercise.exerciseType, props.settings.exercises);
  return (
    <Modal shouldShowClose={true} onClose={props.onClose}>
      <div style={{ minWidth: "15rem" }}>
        {!props.hideVariables && (
          <>
            <ExerciseRM
              name="1 Rep Max"
              rmKey="rm1"
              exercise={exercise}
              settings={props.settings}
              onEditVariable={(value) => {
                props.onEditVariable("rm1", value);
              }}
            />
          </>
        )}
        {(hasStateVariables || props.hideVariables) && (
          <>
            <h2 className="mb-2 text-lg text-center">Edit state variables</h2>
            {hasStateVariables ? (
              <ProgramStateVariables
                settings={props.settings}
                state={state}
                stateMetadata={stateMetadata}
                onEditStateVariable={props.onEditStateVariable}
              />
            ) : (
              <div className="px-4 py-2 text-sm italic text-center text-text-secondary">No state variables</div>
            )}
          </>
        )}
        <div className="mt-4 text-center">
          <Button
            name="details-workout-playground-save-statvars"
            kind="purple"
            onClick={props.onClose}
            data-cy="modal-edit-mode-save-statvars"
          >
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface IStateProps {
  state: IProgramState;
  stateMetadata?: IProgramStateMetadata;
  onEditStateVariable: (stateKey: string, newValue: string) => void;
  settings: ISettings;
}

function ProgramStateVariables(props: IStateProps): JSX.Element {
  return (
    <section className="px-4 py-2 bg-background-cardpurple rounded-2xl">
      {ObjectUtils_keys(props.state).map((stateKey, i) => {
        const value = props.state[stateKey];
        const displayValue = Weight_is(value) || Weight_isPct(value) ? value.value : value;

        return (
          <MenuItemEditable
            name={stateKey}
            isBorderless={i === Object.keys(props.state).length - 1}
            nextLine={
              props.stateMetadata?.[stateKey]?.userPrompted ? (
                <div style={{ marginTop: "-0.75rem" }} className="mb-1 text-xs text-text-secondary">
                  User Prompted
                </div>
              ) : undefined
            }
            isNameBold={true}
            type="number"
            value={displayValue.toString()}
            valueUnits={Weight_is(value) || Weight_isPct(value) ? value.unit : undefined}
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
