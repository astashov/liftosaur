import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";

export function ModalAmrap(props: { dispatch: IDispatch }): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  return (
    <section className="absolute inset-0 flex items-center justify-center">
      <div data-name="overlay" className="absolute inset-0 bg-gray-400 opacity-50"></div>
      <div data-name="modal" className="bg-white p-4 rounded-lg relative shadow-lg">
        <h3 className="font-bold pb-2">Please enter number of AMRAP reps</h3>
        <form>
          <input
            ref={textInput}
            className="bg-white focus:outline-none focus:shadow-outline border border-gray-300 rounded-lg py-2 px-4 block w-full appearance-none leading-normal"
            type="number"
            min="0"
            placeholder="Number of completed reps"
            autofocus
          />
          <div className="mt-4 text-right">
            <Button
              type="button"
              kind="gray"
              className="mr-3"
              onClick={() => props.dispatch({ type: "ChangeAMRAP", value: undefined })}
            >
              Clear
            </Button>
            <Button
              kind="green"
              type="submit"
              onClick={() => {
                const value = textInput.current?.value;
                const numValue = value != null ? parseInt(value, 10) : undefined;
                props.dispatch({
                  type: "ChangeAMRAP",
                  value: numValue != null && !isNaN(numValue) ? numValue : undefined
                });
              }}
            >
              Done
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
