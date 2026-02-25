import { IDispatch } from "../ducks/types";
import { h, JSX } from "preact";
import { MenuItemWrapper } from "./menuItem";
import { Thunk_importProgram } from "../ducks/thunks";
import { Importer } from "./importer";
import { useCallback } from "preact/hooks";

interface IImporterProgramProps {
  dispatch: IDispatch;
}

export function ImporterProgram(props: IImporterProgramProps): JSX.Element {
  const onFileSelect = useCallback(
    (contents: string) => {
      const warningLabel =
        "Importing new program will overwrite an existing one if a program with the same id exists, or create a new one otherwise.";
      if (confirm(warningLabel)) {
        props.dispatch(Thunk_importProgram({ decoded: contents }));
      }
    },
    [props.dispatch]
  );

  return (
    <Importer onFileSelect={onFileSelect}>
      {(onClick) => {
        return (
          <MenuItemWrapper name="Import program from JSON file" onClick={onClick}>
            <button className="py-3 nm-import-program-from-json">Import program from JSON file</button>
          </MenuItemWrapper>
        );
      }}
    </Importer>
  );
}
