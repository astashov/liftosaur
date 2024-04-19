import { h, JSX, Fragment } from "preact";
import { Ref, useRef } from "preact/hooks";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { Modal } from "./modal";
import { Input } from "./input";
import { IHistoryRecord, IPercentage, IProgramExercise, ISettings, IWeight } from "../types";
import { GroupHeader } from "./groupHeader";
import { ObjectUtils } from "../utils/object";
import { Weight } from "../models/weight";
import { SendMessage } from "../utils/sendMessage";
import { ProgramExercise } from "../models/programExercise";

interface IModalAmrapProps {
  progress: IHistoryRecord;
  dispatch: IDispatch;
  settings: ISettings;
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
  const progress = props.progress;
  const amrapModal = progress?.ui?.amrapModal;
  const entryIndex = amrapModal?.entryIndex || 0;
  const setIndex = amrapModal?.setIndex || 0;
  const initialReps = progress.entries[entryIndex]?.sets[setIndex]?.completedReps;
  const initialRpe = progress.entries[entryIndex]?.sets[setIndex]?.completedRpe;
  const initialWeight = progress.entries[entryIndex]?.sets[setIndex]?.weight;

  const isAmrap = !!amrapModal?.isAmrap;
  const logRpe = !!amrapModal?.logRpe;
  const askWeight = !!amrapModal?.askWeight;
  const userVars = !!amrapModal?.userVars;

  const amrapContainer = useRef<HTMLDivElement>(null);
  const amrapInput = useRef<HTMLInputElement>(null);
  const rpeContainer = useRef<HTMLDivElement>(null);
  const weightContainer = useRef<HTMLDivElement>(null);
  const rpeInput = useRef<HTMLInputElement>(null);
  const weightInput = useRef<HTMLInputElement>(null);
  const stateMetadata = props.programExercise
    ? ProgramExercise.getStateMetadata(props.programExercise, props.allProgramExercises) || {}
    : {};
  const stateMetadataKeys = ObjectUtils.keys(stateMetadata).filter((k) => stateMetadata[k]?.userPrompted);
  const userVarInputs = stateMetadataKeys.reduce<Record<keyof typeof stateMetadata, Ref<HTMLInputElement>>>(
    (memo, k) => {
      memo[k] = useRef<HTMLInputElement>(null);
      return memo;
    },
    {}
  );
  const state = props.programExercise ? ProgramExercise.getState(props.programExercise, props.allProgramExercises) : {};

  function onDone(
    userVarValues: Record<string, number | IWeight | IPercentage> = {},
    amrapValue?: number,
    rpeValue?: number,
    weightValue?: IWeight
  ): void {
    props.dispatch({
      type: "ChangeAMRAPAction",
      amrapValue,
      rpeValue,
      weightValue,
      setIndex: setIndex,
      entryIndex: entryIndex,
      allProgramExercises: props.allProgramExercises,
      programExercise: props.programExercise,
      isAmrap: isAmrap,
      logRpe: logRpe,
      askWeight: askWeight,
      userVars: userVarValues,
    });
    if (props.onDone != null) {
      props.onDone();
    }
  }

  return (
    <Modal
      isHidden={!amrapModal}
      autofocusInputRef={isAmrap ? amrapInput : logRpe ? rpeInput : undefined}
      preautofocus={[
        [amrapContainer, (el) => toggleElement(el, isAmrap, initialReps)],
        [rpeContainer, (el) => toggleElement(el, logRpe, initialRpe)],
        [weightContainer, (el) => toggleElement(el, askWeight, initialWeight?.value)],
      ]}
      shouldShowClose={true}
      onClose={() => onDone()}
    >
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="mb-2" ref={amrapContainer}>
          <Input
            label="Number of completed reps"
            defaultValue={initialReps}
            ref={amrapInput}
            data-cy="modal-amrap-input"
            data-name="modal-input-autofocus"
            type="tel"
            min="0"
          />
        </div>
        <div className="mb-2" ref={weightContainer}>
          <Input
            label={`Completed Weight (${props.settings.units})`}
            defaultValue={initialWeight?.value}
            ref={weightInput}
            data-cy="modal-amrap-weight-input"
            type="number"
          />
        </div>
        <div className="mb-2" ref={rpeContainer}>
          <Input
            label="Completed RPE"
            defaultValue={initialRpe}
            ref={rpeInput}
            data-cy="modal-rpe-input"
            type="number"
            min="0"
            max="10"
          />
        </div>
        {props.programExercise && userVars && (
          <UserPromptedStateVars
            programExercise={props.programExercise}
            allProgramExercises={props.allProgramExercises}
            userVarInputs={userVarInputs}
            state={state}
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
              onDone();
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
              const amrapValue = isAmrap ? amrapInput.current?.value : undefined;
              const amrapNumValue = amrapValue != null ? parseInt(amrapValue, 10) : undefined;

              const rpeValue = logRpe ? rpeInput.current?.value : undefined;
              const rpeNumValue = rpeValue != null ? parseFloat(rpeValue) : undefined;

              const weightValue = askWeight ? weightInput.current?.value : undefined;
              const weightNumValue = weightValue != null ? parseFloat(weightValue) : undefined;
              const weight =
                weightNumValue && !isNaN(weightNumValue)
                  ? Weight.build(weightNumValue, props.settings.units)
                  : undefined;

              const userVarValues = ObjectUtils.keys(userVarInputs).reduce<
                Record<string, number | IWeight | IPercentage>
              >((memo, k) => {
                const value = userVarInputs[k].current?.value;
                let numValue = value != null ? parseFloat(value) : 0;
                numValue = isNaN(numValue) ? 0 : numValue;
                const previousValue = state[k];
                if (numValue == null) {
                  numValue =
                    Weight.is(previousValue) || Weight.isPct(previousValue) ? previousValue.value : previousValue;
                }
                const typedValue = Weight.is(previousValue)
                  ? Weight.build(numValue, previousValue.unit)
                  : Weight.isPct(previousValue)
                  ? Weight.buildPct(numValue)
                  : numValue;
                memo[k] = typedValue;
                return memo;
              }, {});

              onDone(
                userVarValues,
                amrapNumValue != null && !isNaN(amrapNumValue) ? amrapNumValue : undefined,
                rpeNumValue != null && !isNaN(rpeNumValue) ? rpeNumValue : undefined,
                weight
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
  userVarInputs: Record<string, Ref<HTMLInputElement>>;
  state: Record<string, number | IWeight | IPercentage>;
}

export function UserPromptedStateVars(props: IUserPromptedStateVarsProps): JSX.Element {
  return (
    <>
      <GroupHeader size="large" name="Enter new state variables values" />
      {ObjectUtils.keys(props.userVarInputs).map((key, i) => {
        const value = props.state[key];
        const num = Weight.is(value) || Weight.isPct(value) ? value.value : value;
        const textInput = props.userVarInputs[key];
        const label = Weight.is(value) ? `${key}, ${value.unit}` : key;
        return (
          <div className={i !== 0 ? "mt-2" : ""}>
            <Input
              data-cy={`modal-state-vars-user-prompt-input-${key}`}
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
