import { IDispatch } from "../ducks/types";
import { JSX, h } from "preact";
import { Ref, useRef } from "preact/hooks";
import { Modal } from "./modal";
import { Button } from "./button";
import { Weight } from "../models/weight";
import { IProgramExercise, IWeight } from "../types";
import { GroupHeader } from "./groupHeader";
import { ObjectUtils } from "../utils/object";
import { Input } from "./input";
import { ProgramExercise } from "../models/programExercise";

interface IModalStateVarsUserPromptProps {
  dispatch: IDispatch;
  programExercise?: IProgramExercise;
  allProgramExercises: IProgramExercise[];
  isHidden: boolean;
}

export function ModalStateVarsUserPrompt(props: IModalStateVarsUserPromptProps): JSX.Element {
  const programExercise = props.programExercise;
  const stateMetadata = programExercise
    ? ProgramExercise.getStateMetadata(programExercise, props.allProgramExercises) || { fake: { userPrompted: true } }
    : { fake: { userPrompted: true } };
  const stateMetadataKeys = ObjectUtils.keys(stateMetadata).filter((k) => stateMetadata[k]?.userPrompted);
  const textInputs = stateMetadataKeys.reduce<Record<keyof typeof stateMetadata, Ref<HTMLInputElement>>>((memo, k) => {
    memo[k] = useRef<HTMLInputElement>(null);
    return memo;
  }, {});
  const firstTextInput = stateMetadataKeys.length > 0 ? textInputs[stateMetadataKeys[0]] : undefined;
  const state = programExercise ? ProgramExercise.getState(programExercise, props.allProgramExercises) : { fake: 0 };
  return (
    <Modal isHidden={props.isHidden} autofocusInputRef={firstTextInput}>
      <GroupHeader size="large" name="Enter new state variables values" />
      <form
        data-cy="modal-state-vars-user-prompt"
        onSubmit={(e) => {
          e.preventDefault();
          const newUserPromptedStateVars = ObjectUtils.keys(textInputs).reduce<Record<string, number | IWeight>>(
            (memo, k) => {
              const value = textInputs[k].current?.value;
              let numValue = value != null ? parseFloat(value) : undefined;
              const previousValue = state[k];
              if (numValue == null) {
                numValue = Weight.is(previousValue) ? previousValue.value : previousValue;
              }
              const typedValue = Weight.is(previousValue) ? Weight.build(numValue, previousValue.unit) : numValue;
              memo[k] = typedValue;
              return memo;
            },
            {}
          );
          if (programExercise) {
            props.dispatch({
              type: "ConfirmUserPromptedStateVars",
              programExerciseId: programExercise.id,
              userPromptedStateVars: newUserPromptedStateVars,
            });
          }
        }}
      >
        {ObjectUtils.keys(stateMetadata)
          .filter((k) => stateMetadata[k]?.userPrompted)
          .map((key, i) => {
            const value = state[key];
            const num = Weight.is(value) ? value.value : value;
            const textInput = textInputs[key];
            const label = Weight.is(value) ? `${key}, ${value.unit}` : key;
            return (
              <div className={i !== 0 ? "mt-2" : ""}>
                <Input
                  data-cy={`modal-state-vars-user-prompt-input-${key}`}
                  key={i}
                  label={label}
                  ref={textInput}
                  defaultValue={num}
                  type="tel"
                  autofocus={i === 0}
                />
              </div>
            );
          })}
        <div className="mt-4 text-center">
          <Button
            data-cy="modal-state-vars-user-prompt-submit"
            kind="orange"
            className="ls-submit-state-var-user-prompt"
            type="submit"
          >
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
