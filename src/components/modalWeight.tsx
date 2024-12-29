import { IDispatch } from "../ducks/types";
import React, { JSX } from "react";
import { useState } from "react";
import { Modal } from "./modal";
import { Button } from "./button";
import { Weight } from "../models/weight";
import { IProgramExercise, ISettings, IWeight } from "../types";
import { GroupHeader } from "./groupHeader";
import { InputWeight } from "./inputWeight";

interface IModalWeightProps {
  dispatch: IDispatch;
  weight: number | IWeight;
  programExercise?: IProgramExercise;
  isHidden: boolean;
  settings: ISettings;
}

export function ModalWeight(props: IModalWeightProps): JSX.Element {
  const [weight, setWeight] = useState(
    typeof props.weight == "number" ? Weight.build(props.weight, props.settings.units) : props.weight
  );
  console.log("Weight", weight);
  return (
    <Modal
      isHidden={props.isHidden}
      shouldShowClose={true}
      onClose={() => props.dispatch({ type: "ConfirmWeightAction", weight: undefined })}
    >
      <GroupHeader size="large" name="Please enter weight" />
      <h4 className="text-sm">
        It changes <strong>only for this workout!</strong> If you want to change for this and future workouts, change
        the weight in the program.
      </h4>
      <form onSubmit={(e) => e.preventDefault()}>
        <InputWeight
          data-cy="modal-weight-input"
          value={weight}
          units={["kg", "lb"]}
          label="Weight"
          onUpdate={(newValue) => {
            if (Weight.is(newValue)) {
              setWeight(newValue);
            }
          }}
          settings={props.settings}
          exerciseType={props.programExercise?.exerciseType}
        />
        <div className="mt-4 text-right">
          <Button
            name="modal-weight-cancel"
            type="button"
            kind="grayv2"
            data-cy="modal-weight-cancel"
            className="mr-3"
            onClick={() => props.dispatch({ type: "ConfirmWeightAction", weight: undefined })}
          >
            Cancel
          </Button>
          <Button
            name="modal-weight-submit"
            kind="orange"
            data-cy="modal-weight-submit"
            className="ls-modal-set-weight"
            type="submit"
            onClick={() => {
              props.dispatch({
                type: "ConfirmWeightAction",
                weight: Weight.is(weight) ? weight : undefined,
                programExercise: props.programExercise,
              });
            }}
          >
            Done
          </Button>
        </div>
      </form>
    </Modal>
  );
}
