import { JSX, useRef } from "react";
import { Button } from "./button";
import { GroupHeader } from "./groupHeader";
import { Input } from "./input";

export function ModalNewGymContent(props: { onInput: (value?: string) => void }): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  return (
    <>
      <h2 className="mb-2 text-lg font-bold text-center">New Gym</h2>
      <div className="mb-2 text-xs text-text-secondary">
        You can add a new gym with a set of exercises, and when you switch between gyms, the exercises will use the
        equipment from the selected gym.
      </div>
      <GroupHeader size="large" name="Enter new gym name" />
      <form onSubmit={(e) => e.preventDefault()}>
        <Input
          label="Gym name"
          ref={textInput}
          required={true}
          requiredMessage="Please enter a name for the gym"
          type="text"
          placeholder="Home Gym"
        />
        <div className="mt-4 text-right">
          <Button
            name="add-gym-cancel"
            type="button"
            kind="grayv2"
            className="mr-3"
            onClick={() => props.onInput(undefined)}
          >
            Cancel
          </Button>
          <Button
            kind="purple"
            type="submit"
            name="add-gym-submit"
            className="ls-add-gym"
            onClick={() => {
              const value = textInput.current?.value;
              if (value) {
                props.onInput(value);
              }
            }}
          >
            Add
          </Button>
        </div>
      </form>
    </>
  );
}

