import { h, JSX, Fragment } from "preact";
import { MenuItemEditable } from "./menuItemEditable";
import { Exercise, IExercise } from "../models/exercise";
import { IExerciseDataValue, ISettings } from "../types";
import { IconCalculator } from "./icons/iconCalculator";
import { useState } from "preact/hooks";
import { Modal } from "./modal";
import { RepMaxCalculator } from "./repMaxCalculator";

interface IExerciseRMProps {
  name: string;
  rmKey: keyof IExerciseDataValue;
  exercise: IExercise;
  settings: ISettings;
  onEditVariable: (value: number) => void;
}

export function ExerciseRM(props: IExerciseRMProps): JSX.Element {
  const rm = Exercise.onerm(props.exercise, props.settings);
  const [showCalculator, setShowCalculator] = useState(false);

  return (
    <section data-cy="exercise-stats-1rm-set" className="px-4 py-1 mt-2 font-bold bg-purple-100 rounded-2xl">
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
              onClick={() => setShowCalculator(true)}
            >
              <IconCalculator size={16} color="#607284" />
            </button>
          </>
        }
      />
      <div className="text-xs italic font-normal text-right">
        Available in Liftoscript as <strong>{props.rmKey}</strong> variable
      </div>
      {showCalculator && (
        <Modal shouldShowClose={true} onClose={() => setShowCalculator(false)}>
          <RepMaxCalculator
            backLabel="Close"
            unit={props.settings.units}
            onSelect={(weightValue) => {
              if (weightValue != null) {
                props.onEditVariable(weightValue);
              }
              setShowCalculator(false);
            }}
          />
        </Modal>
      )}
    </section>
  );
}
