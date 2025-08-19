import { IDispatch } from "../ducks/types";
import { h, JSX } from "preact";
import { MenuItemWrapper } from "./menuItem";
import { Thunk } from "../ducks/thunks";
import { Importer } from "./importer";
import { useCallback, useState } from "preact/hooks";
import { IconHelp } from "./icons/iconHelp";
import { InternalLink } from "../internalLink";

interface IImporterLiftosaurCsvProps {
  dispatch: IDispatch;
}

export function ImporterLiftosaurCsv(props: IImporterLiftosaurCsvProps): JSX.Element {
  const onFileSelect = useCallback(
    (contents: string) => {
      const warningLabel = "Importing new data WILL NOT wipe out your current data.";
      if (confirm(warningLabel)) {
        props.dispatch(Thunk.importCsvData(contents));
      }
    },
    [props.dispatch]
  );

  const [showHelp, setShowHelp] = useState(false);

  return (
    <Importer onFileSelect={onFileSelect}>
      {(onClick) => {
        return (
          <MenuItemWrapper name="Import CSV">
            <div className="py-1">
              <div className="flex">
                <div className="flex-1 text-left">
                  <button className="w-full py-2 text-left nm-import-data-from-csv-file" onClick={onClick}>
                    Import history from CSV file
                  </button>
                </div>
                <div className="flex items-center ml-2">
                  <button className="p-2" onClick={() => setShowHelp(!showHelp)}>
                    <IconHelp />
                  </button>
                </div>
              </div>
              {showHelp && (
                <div className="text-xs text-center text-text-secondary">
                  <InternalLink
                    name="download-example-csv"
                    href="https://www.liftosaur.com/liftosaur_example_csv.zip"
                    className="font-bold underline text-text-link"
                  >
                    Download an example and instructions
                  </InternalLink>{" "}
                  how to format a CSV file.
                </div>
              )}
            </div>
          </MenuItemWrapper>
        );
      }}
    </Importer>
  );
}
