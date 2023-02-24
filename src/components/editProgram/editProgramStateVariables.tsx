import { h, JSX } from "preact";
import { Weight } from "../../models/weight";
import { IProgramExercise } from "../../types";
import { ObjectUtils } from "../../utils/object";
import { GroupHeader } from "../groupHeader";
import { LinkButton } from "../linkButton";
import { MenuItemEditable } from "../menuItemEditable";

interface IStateProps {
  programExercise: IProgramExercise;
  onAddStateVariable: () => void;
  onEditStateVariable: (stateKey: string, newValue?: string) => void;
}

export function EditProgramStateVariables(props: IStateProps): JSX.Element {
  const { programExercise } = props;
  const reuseLogicId = programExercise.reuseLogic?.selected;
  const state = reuseLogicId ? programExercise.reuseLogic?.states[reuseLogicId]! : programExercise.state;

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
      {ObjectUtils.keys(state).map((stateKey) => {
        const value = state[stateKey];
        const displayValue = Weight.is(value) ? value.value : value;

        return (
          <MenuItemEditable
            name={stateKey}
            isNameBold={true}
            type="number"
            value={displayValue.toString()}
            valueUnits={Weight.is(value) ? value.unit : undefined}
            hasClear={!reuseLogicId}
            onChange={(newValue) => {
              props.onEditStateVariable(stateKey, newValue);
            }}
          />
        );
      })}
      {!reuseLogicId && (
        <div className="p-1">
          <LinkButton onClick={props.onAddStateVariable}>Add State Variable</LinkButton>
        </div>
      )}
    </section>
  );
}
