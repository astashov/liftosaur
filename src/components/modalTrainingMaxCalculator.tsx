import { h, JSX } from "preact";
import { useRef, useState } from "preact/hooks";
import { Button } from "./button";
import { Modal } from "./modal";
import { IDispatch } from "../ducks/types";
import { Weight } from "../models/weight";
import { I5314BState, I5314BExcerciseType } from "../models/programs/the5314bProgram";
import { lb } from "../utils/lens";

interface IProps {
  excercise: I5314BExcerciseType;
  onClose: () => void;
  dispatch: IDispatch;
}

export function ModalTrainingMaxCalculator(props: IProps): JSX.Element {
  const weightInput = useRef<HTMLInputElement>(null);
  const repsInput = useRef<HTMLInputElement>(null);
  const [weight, setWeight] = useState<number | undefined>(undefined);
  const [reps, setReps] = useState<number | undefined>(undefined);
  return (
    <Modal shouldShowClose={true} onClose={props.onClose}>
      <h3 className="pb-2 text-sm font-bold">Enter weight lifted and number of reps</h3>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="mb-2">
          <label>
            <span className="text-sm">Weight lifted</span>
            <input
              ref={weightInput}
              className="block w-full px-4 py-2 leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline"
              type="number"
              min="0"
              onInput={() => setWeight(parseInt(weightInput.current.value, 10))}
              placeholder="0 lbs"
              autofocus
            />
          </label>
        </div>
        <div className="mb-2">
          <label>
            <span className="text-sm">Reps lifted</span>
            <input
              ref={repsInput}
              className="block w-full px-4 py-2 leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline"
              type="number"
              min="0"
              onInput={() => setReps(parseInt(repsInput.current.value, 10))}
              placeholder="0 lbs"
            />
          </label>
        </div>
        <div className="">
          Calculated Training Max:{" "}
          <strong>{weight != null && reps != null ? Weight.getTrainingMax(weight, reps) : "-"}</strong>
        </div>
        <div className="mt-4 text-right">
          <Button type="button" kind="gray" className="mr-3" onClick={() => props.onClose()}>
            Cancel
          </Button>
          <Button
            kind="green"
            type="submit"
            disabled={weight == null || reps == null}
            onClick={() => {
              if (weight != null && reps != null) {
                const trainingMax = Weight.getTrainingMax(weight, reps);
                const lensPlay = lb<I5314BState>().p("main").p(props.excercise).p("trainingMax").play(trainingMax);
                props.dispatch({ type: "UpdateProgramState", name: "the5314b", lensPlay });
                props.onClose();
              }
            }}
          >
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
