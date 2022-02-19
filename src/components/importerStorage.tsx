import { IDispatch } from "../ducks/types";
import { h, JSX } from "preact";
import { useRef } from "preact/compat";
import { MenuItem } from "./menuItem";
import { Thunk } from "../ducks/thunks";

interface IImporterStorageProps {
  dispatch: IDispatch;
}

export function ImporterStorage(props: IImporterStorageProps): JSX.Element {
  const fileInput = useRef<HTMLInputElement>();

  return (
    <div>
      <input
        className="hidden"
        type="file"
        ref={fileInput}
        onChange={() => {
          const file = fileInput.current.files?.[0];
          if (file != null) {
            const reader = new FileReader();
            reader.addEventListener("load", async (event) => {
              const result = event.target?.result;
              if (typeof result === "string") {
                if (
                  confirm(
                    "Importing new data will wipe out your current data. If you don't want to lose it, make sure to 'Export Data' first. Press 'Okay' to proceed with import."
                  )
                ) {
                  props.dispatch(Thunk.importStorage(result));
                }
              }
            });
            reader.readAsText(file);
          }
        }}
      />
      <MenuItem
        name="Import Data"
        onClick={() => {
          fileInput.current.click();
        }}
      />
    </div>
  );
}
