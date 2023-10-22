import { h, JSX, Fragment } from "preact";
import { useState } from "preact/hooks";
import { Weight } from "../../models/weight";
import { IProgramExercise, IProgramStateMetadata, ISettings, IUnit } from "../../types";
import { ObjectUtils } from "../../utils/object";
import { StringUtils } from "../../utils/string";
import { GroupHeader } from "../groupHeader";
import { IconCalculator } from "../icons/iconCalculator";
import { LinkButton } from "../linkButton";
import { MenuItemEditable } from "../menuItemEditable";
import { Modal } from "../modal";
import { RepMaxCalculator } from "../repMaxCalculator";
import { EditProgramConvertStateVariables } from "./editProgramConvertStateVariables";

interface IStateProps {
  programExercise: IProgramExercise;
  settings: ISettings;
  stateMetadata?: IProgramStateMetadata;
  onAddStateVariable: () => void;
  onEditStateVariable: (stateKey: string, newValue?: string) => void;
  onChangeStateVariableUnit: () => void;
}

export function EditProgramStateVariables(props: IStateProps): JSX.Element {
  const { programExercise } = props;
  const reuseLogicId = programExercise.reuseLogic?.selected;
  const state = reuseLogicId ? programExercise.reuseLogic?.states[reuseLogicId]! : programExercise.state;
  const [showCalculator, setShowCalculator] = useState<[string, IUnit] | undefined>(undefined);

  return (
    <section className="px-4 py-2 bg-purple-100 rounded-2xl">
      <GroupHeader
        topPadding={false}
        name={reuseLogicId ? "Reused State Variables" : "State Variables"}
        help={
          <span>
            Variables you can use in all Liftoscript scripts of this exercise. They will preserve their values between
            workouts, allowing to use them for progressive overload, for tracking failures, or for anything really.
          </span>
        }
      />
      <EditProgramConvertStateVariables
        settings={props.settings}
        programExercise={programExercise}
        onConvert={props.onChangeStateVariableUnit}
      />
      {ObjectUtils.keys(state).map((stateKey) => {
        const value = state[stateKey];
        const displayValue = Weight.is(value) ? value.value : value;

        return (
          <MenuItemEditable
            name={stateKey}
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
            hasClear={!reuseLogicId}
            after={
              Weight.is(value) ? (
                <button
                  data-cy={`state-${StringUtils.dashcase(stateKey)}-calculator`}
                  className="p-2 ml-2 nm-rm-calculator"
                  style={{ marginRight: "-0.25rem" }}
                  onClick={() => setShowCalculator([stateKey, value.unit])}
                >
                  <IconCalculator size={16} color="#171718" />
                </button>
              ) : (
                <></>
              )
            }
            onChange={(newValue) => {
              props.onEditStateVariable(stateKey, newValue);
            }}
          />
        );
      })}
      {!reuseLogicId && (
        <div className="p-1">
          <LinkButton name="add-state-variable" data-cy="add-state-variable" onClick={props.onAddStateVariable}>
            Add State Variable
          </LinkButton>
        </div>
      )}
      {showCalculator && (
        <Modal shouldShowClose={true} onClose={() => setShowCalculator(undefined)}>
          <RepMaxCalculator
            backLabel="Close"
            unit={showCalculator[1]}
            onSelect={(weightValue) => {
              if (weightValue != null) {
                props.onEditStateVariable(showCalculator[0], `${weightValue}`);
              }
              setShowCalculator(undefined);
            }}
          />
        </Modal>
      )}
    </section>
  );
}
