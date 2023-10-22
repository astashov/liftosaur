import { IDispatch } from "../ducks/types";
import { h, JSX } from "preact";
import { MenuItemWrapper } from "./menuItem";
import { Thunk } from "../ducks/thunks";
import { Importer } from "./importer";
import { useCallback } from "preact/hooks";

interface IImporterStorageProps {
  dispatch: IDispatch;
}

export function ImporterStorage(props: IImporterStorageProps): JSX.Element {
  const onFileSelect = useCallback(
    (contents: string) => {
      const warningLabel =
        "Importing new data will wipe out your current data. If you don't want to lose it, make sure to 'Export data to file' first. Press 'Okay' to proceed with import.";
      if (confirm(warningLabel)) {
        props.dispatch(Thunk.importStorage(contents));
      }
    },
    [props.dispatch]
  );

  return (
    <Importer onFileSelect={onFileSelect}>
      {(onClick) => {
        return (
          <MenuItemWrapper name="Import data from JSON file" onClick={onClick}>
            <button className="py-3 nm-import-data-from-file">Import data from file</button>
          </MenuItemWrapper>
        );
      }}
    </Importer>
  );
}
