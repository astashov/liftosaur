import { JSX } from "react";
import { MenuItemEditable } from "./menuItemEditable";
import { IExercise, Exercise_onerm } from "../models/exercise";
import { IExerciseDataValue, ISettings } from "../types";
import { IconCalculator } from "./icons/iconCalculator";
import { useModalDispatch, useModalResult, Modal_open } from "../navigation/ModalStateContext";
import { getNavigationRef } from "../navigation/navUtils";

interface IExerciseRMProps {
  name: string;
  rmKey: keyof IExerciseDataValue;
  exercise: IExercise;
  settings: ISettings;
  onEditVariable: (value: number) => void;
}

export function ExerciseRM(props: IExerciseRMProps): JSX.Element {
  const rm = Exercise_onerm(props.exercise, props.settings);
  const modalDispatch = useModalDispatch();

  useModalResult("repMaxCalculatorModal", (weightValue) => {
    if (weightValue != null) {
      props.onEditVariable(weightValue);
    }
  });

  return (
    <section data-cy="exercise-stats-1rm-set" className="px-4 py-1 mt-2 font-bold bg-background-cardpurple rounded-2xl">
      <MenuItemEditable
        type="number"
        name={props.name}
        isBorderless={true}
        onChange={(v) => {
          const value = v ? parseFloat(v) : undefined;
          if (value && !isNaN(value)) {
            props.onEditVariable(value);
          }
        }}
        value={`${rm.value}`}
        after={
          <>
            <span className="mr-2 font-normal text-text-secondary">{rm.unit}</span>
            <button
              className="p-2 nm-show-rm-calculator"
              data-cy="onerm-calculator"
              style={{ marginRight: "-0.25rem" }}
              onClick={() => {
                Modal_open(modalDispatch, "repMaxCalculatorModal", { unit: props.settings.units });
                getNavigationRef().then(({ navigationRef: ref }) => ref.navigate("repMaxCalculatorModal"));
              }}
            >
              <IconCalculator size={16} />
            </button>
          </>
        }
      />
      <div className="text-xs italic font-normal text-right">
        Available in Liftoscript as <strong>{props.rmKey}</strong> variable
      </div>
    </section>
  );
}
