import { h, JSX, Fragment } from "preact";
import { Ref, useRef } from "preact/hooks";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { Modal } from "./modal";
import { Input } from "./input";
import { IProgramExercise, IWeight } from "../types";
import { GroupHeader } from "./groupHeader";
import { ObjectUtils } from "../utils/object";
import { Weight } from "../models/weight";
import { SendMessage } from "../utils/sendMessage";
import { ProgramExercise } from "../models/programExercise";

interface IModalAmrapProps {
  isHidden: boolean;
  dispatch: IDispatch;
  initialReps?: number;
  initialRpe?: number;
  isAmrap: boolean;
  logRpe: boolean;
  userVars: boolean;
  programExercise?: IProgramExercise;
  allProgramExercises: IProgramExercise[];
  onDone?: () => void;
}

function toggleElement(el: HTMLElement, isVisible: boolean, value?: string | number): void {
  if (isVisible) {
    el.classList.remove("invisible-and-shrunk");
    const input = el.querySelector("input") as HTMLInputElement | undefined;
    if (input != null) {
      input.value = value == null ? "" : `${value}`;
    }
  } else {
    el.classList.add("invisible-and-shrunk");
  }
}

export function ModalAmrap(props: IModalAmrapProps): JSX.Element {
  const amrapContainer = useRef<HTMLDivElement>(null);
  const amrapInput = useRef<HTMLInputElement>(null);
  const rpeContainer = useRef<HTMLDivElement>(null);
  const rpeInput = useRef<HTMLInputElement>(null);
  const userVarValues = useRef<Record<string, number | IWeight>>({});

  function onDone(amrapValue?: number, rpeValue?: number): void {
    props.dispatch({
      type: "ChangeAMRAPAction",
      amrapValue,
      rpeValue,
      isAmrap: props.isAmrap,
      logRpe: props.logRpe,
      userVars: userVarValues.current,
      programExerciseId: props.programExercise?.id,
    });
    if (props.onDone != null) {
      props.onDone();
    }
  }

  return (
    <Modal
      isHidden={props.isHidden}
      autofocusInputRef={props.isAmrap ? amrapInput : props.logRpe ? rpeInput : undefined}
      preautofocus={[
        [amrapContainer, (el) => toggleElement(el, props.isAmrap, props.initialReps)],
        [rpeContainer, (el) => toggleElement(el, props.logRpe, props.initialRpe)],
      ]}
      shouldShowClose={true}
      onClose={() => onDone(undefined, undefined)}
    >
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="mb-2" ref={amrapContainer}>
          <Input
            label="Number of completed reps"
            defaultValue={props.initialReps}
            ref={amrapInput}
            data-cy="modal-amrap-input"
            data-name="modal-input-autofocus"
            type="tel"
            min="0"
          />
        </div>
        <div className="mb-2" ref={rpeContainer}>
          <Input
            label="Completed RPE"
            defaultValue={props.initialRpe}
            ref={rpeInput}
            data-cy="modal-rpe-input"
            type="number"
            min="0"
            max="10"
          />
        </div>
        {props.programExercise && props.userVars && (
          <UserPromptedStateVars
            programExercise={props.programExercise}
            allProgramExercises={props.allProgramExercises}
            onUpdate={(val) => (userVarValues.current = val)}
          />
        )}
        <div className="mt-4 text-right">
          <Button
            name="modal-amrap-clear"
            data-cy="modal-amrap-clear"
            type="button"
            kind="grayv2"
            className="mr-3"
            onClick={(e) => {
              e.preventDefault();
              onDone(undefined);
            }}
          >
            Clear
          </Button>
          <Button
            name="modal-amrap-submit"
            kind="orange"
            type="submit"
            data-cy="modal-amrap-submit"
            className="ls-modal-set-amrap"
            onClick={(e) => {
              e.preventDefault();
              const amrapValue = amrapInput.current?.value;
              const amrapNumValue = amrapValue != null ? parseInt(amrapValue, 10) : undefined;

              const rpeValue = rpeInput.current?.value;
              const rpeNumValue = rpeValue != null ? parseFloat(rpeValue) : undefined;

              onDone(
                amrapNumValue != null && !isNaN(amrapNumValue) ? amrapNumValue : undefined,
                rpeNumValue != null && !isNaN(rpeNumValue) ? rpeNumValue : undefined
              );
            }}
          >
            Done
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface IUserPromptedStateVarsProps {
  programExercise: IProgramExercise;
  allProgramExercises: IProgramExercise[];
  onUpdate: (newStateVars: Record<string, number | IWeight>) => void;
}

export function UserPromptedStateVars(props: IUserPromptedStateVarsProps): JSX.Element {
  const programExercise = props.programExercise;
  const stateMetadata = ProgramExercise.getStateMetadata(programExercise, props.allProgramExercises) || {};
  const stateMetadataKeys = ObjectUtils.keys(stateMetadata).filter((k) => stateMetadata[k]?.userPrompted);
  const textInputs = stateMetadataKeys.reduce<Record<keyof typeof stateMetadata, Ref<HTMLInputElement>>>((memo, k) => {
    memo[k] = useRef<HTMLInputElement>(null);
    return memo;
  }, {});
  const state = programExercise ? ProgramExercise.getState(programExercise, props.allProgramExercises) : { fake: 0 };

  function onInput(): void {
    props.onUpdate(
      ObjectUtils.keys(textInputs).reduce<Record<string, number | IWeight>>((memo, k) => {
        const value = textInputs[k].current?.value;
        let numValue = value != null ? parseFloat(value) : undefined;
        const previousValue = state[k];
        if (numValue == null) {
          numValue = Weight.is(previousValue) ? previousValue.value : previousValue;
        }
        const typedValue = Weight.is(previousValue) ? Weight.build(numValue, previousValue.unit) : numValue;
        memo[k] = typedValue;
        return memo;
      }, {})
    );
  }

  return (
    <>
      <GroupHeader size="large" name="Enter new state variables values" />
      {ObjectUtils.keys(textInputs).map((key, i) => {
        const value = state[key];
        const num = Weight.is(value) ? value.value : value;
        const textInput = textInputs[key];
        const label = Weight.is(value) ? `${key}, ${value.unit}` : key;
        return (
          <div className={i !== 0 ? "mt-2" : ""}>
            <Input
              data-cy={`modal-state-vars-user-prompt-input-${key}`}
              onInput={onInput}
              key={i}
              label={label}
              ref={textInput}
              defaultValue={num}
              step="0.0001"
              type={SendMessage.isIos() ? "number" : "tel"}
              autofocus={i === 0}
            />
          </div>
        );
      })}
    </>
  );
}
