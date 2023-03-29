import { IDispatch } from "../ducks/types";
import { JSX, h, Fragment } from "preact";
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
  if (!programExercise) {
    return <></>;
  }
  const stateMetadata = ProgramExercise.getStateMetadata(programExercise, props.allProgramExercises) || {};
  const stateMetadataKeys = ObjectUtils.keys(stateMetadata).filter((k) => stateMetadata[k]?.userPrompted);
  const textInputs = stateMetadataKeys.reduce<Record<keyof typeof stateMetadata, Ref<HTMLInputElement>>>((memo, k) => {
    memo[k] = useRef<HTMLInputElement>(null);
    return memo;
  }, {});
  const firstTextInput = stateMetadataKeys.length > 0 ? textInputs[stateMetadataKeys[0]] : undefined;
  const state = ProgramExercise.getState(programExercise, props.allProgramExercises);
  return (
    <Modal isHidden={props.isHidden} autofocusInputRef={firstTextInput}>
      <GroupHeader size="large" name="Enter user prompt state variables" />
      <form onSubmit={(e) => e.preventDefault()}>
        {ObjectUtils.keys(stateMetadata)
          .filter((k) => stateMetadata[k]?.userPrompted)
          .map((key, i) => {
            const value = state[key];
            const num = Weight.is(value) ? value.value : value;
            const textInput = textInputs[key];
            return (
              <Input
                key={key}
                label={key}
                ref={i === 0 ? textInput : undefined}
                defaultValue={num}
                type="tel"
                autofocus
              />
            );
          })}
        <div className="mt-4 text-center">
          <Button
            kind="orange"
            className="ls-modal-set-weight"
            type="submit"
            onClick={() => {
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
              props.dispatch({
                type: "ConfirmUserPromptedStateVars",
                programExerciseId: programExercise.id,
                userPromptedStateVars: newUserPromptedStateVars,
              });
            }}
          >
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
