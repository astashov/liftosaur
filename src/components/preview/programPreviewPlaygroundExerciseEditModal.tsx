import { JSX, h, Fragment } from "preact";
import { Button } from "../button";
import { MenuItemEditable } from "../menuItemEditable";
import { Modal } from "../modal";
import { Weight } from "../../models/weight";
import { IProgramExercise, IProgramStateMetadata, ISettings, IExerciseDataValue } from "../../types";
import { ObjectUtils } from "../../utils/object";
import { ProgramExercise } from "../../models/programExercise";
import { ExerciseRM } from "../exerciseRm";
import { Exercise } from "../../models/exercise";

interface IProgramPreviewPlaygroundExerciseEditModalProps {
  programExercise: IProgramExercise;
  onClose: () => void;
  onEditStateVariable: (stateKey: string, newValue: string) => void;
  onEditVariable: (variableKey: keyof IExerciseDataValue, newValue: number) => void;
  settings: ISettings;
}

export function ProgramPreviewPlaygroundExerciseEditModal(
  props: IProgramPreviewPlaygroundExerciseEditModalProps
): JSX.Element {
  const programExercise = props.programExercise;
  const hasStateVariables = ObjectUtils.keys(programExercise.state).length > 0;
  const hasRm1 = ProgramExercise.isUsingVariable(programExercise, "rm1");
  if (!hasStateVariables && !hasRm1) {
    return <></>;
  }
  const exercise = Exercise.get(programExercise.exerciseType, props.settings.exercises);
  return (
    <Modal shouldShowClose={true} onClose={props.onClose}>
      <div style={{ minWidth: "15rem" }}>
        {hasRm1 && (
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
        {hasStateVariables && (
          <>
            <h2 className="mb-2 text-lg text-center">Edit state variables</h2>
            <ProgramStateVariables
              settings={props.settings}
              programExercise={programExercise}
              stateMetadata={programExercise.stateMetadata}
              onEditStateVariable={props.onEditStateVariable}
            />
          </>
        )}
        <div className="mt-4 text-center">
          <Button
            name="details-workout-playground-save-statvars"
            kind="orange"
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
  programExercise: IProgramExercise;
  stateMetadata?: IProgramStateMetadata;
  onEditStateVariable: (stateKey: string, newValue: string) => void;
  settings: ISettings;
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
