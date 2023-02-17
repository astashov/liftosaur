import { h, JSX } from "preact";
import { Button } from "../button";
import { IconInfo } from "../icons/iconInfo";

export function EditProgramVariationsEnable(props: { onClick: () => void }): JSX.Element {
  return (
    <button
      style={{ gap: "1rem" }}
      className="flex flex-wrap items-center justify-center w-full p-4 mt-4 bg-purple-100 rounded-2xl"
      onClick={props.onClick}
    >
      <div className="flex">
        <div className="mr-2">
          <IconInfo />
        </div>
        <div className="flex-1 text-sm text-left">Want to dynamically change number of sets?</div>
      </div>
      <div>
        <Button buttonSize="lg" kind="purple">
          Enable Sets Variations
        </Button>
      </div>
    </button>
  );
}
