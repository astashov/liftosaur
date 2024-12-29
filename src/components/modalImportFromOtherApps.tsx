import React, { JSX } from "react";
import { Modal } from "./modal";
import { GroupHeader } from "./groupHeader";
import { MenuItemWrapper } from "./menuItem";
import { Importer } from "./importer";
import { useCallback } from "react";
import { ImportFromHevy } from "../utils/importFromHevy";
import { IDispatch } from "../ducks/types";
import { IState, updateState } from "../models/state";
import { lb } from "lens-shmens";
import { CollectionUtils } from "../utils/collection";
import RB from "rollbar";
import { ICustomExercise, IHistoryRecord } from "../types";

declare let Rollbar: RB;

interface IProps {
  isHidden: boolean;
  onClose: () => void;
  dispatch: IDispatch;
}

export function ModalImportFromOtherApps(props: IProps): JSX.Element {
  const onFileSelect = useCallback((contents: string) => {
    let historyRecords: IHistoryRecord[];
    let customExercises: Record<string, ICustomExercise>;
    try {
      const result = ImportFromHevy.convertHevyCsvToHistoryRecords(contents);
      historyRecords = result.historyRecords;
      customExercises = result.customExercises;
    } catch (error) {
      const e = error as Error;
      console.error(e);
      Rollbar.error(e);
      historyRecords = [];
      customExercises = {};
      alert("Failed to import history from Hevy.");
    }
    if (historyRecords.length > 0) {
      if (confirm(`Do you want to import ${historyRecords.length} workouts?`)) {
        updateState(props.dispatch, [
          lb<IState>()
            .p("storage")
            .p("history")
            .recordModify((oldHistoryRecords) => {
              return CollectionUtils.sortBy(
                CollectionUtils.uniqBy(oldHistoryRecords.concat(historyRecords), "id"),
                "id"
              );
            }),
          lb<IState>()
            .p("storage")
            .p("settings")
            .p("exercises")
            .recordModify((oldExercises) => {
              return { ...oldExercises, ...customExercises };
            }),
        ]);
      }
    }
    props.onClose();
  }, []);

  return (
    <Modal isFullWidth={true} isHidden={props.isHidden} shouldShowClose={true} onClose={props.onClose}>
      <GroupHeader size="large" name="Import history from other apps" />
      <Importer onFileSelect={onFileSelect}>
        {(onClick) => (
          <div className="ls-import-hevy">
            <MenuItemWrapper name="Upload CSV file from Hevy" onClick={onClick}>
              <button className="py-3 nm-upload-csv-from-hevy">Upload CSV file from Hevy</button>
            </MenuItemWrapper>
          </div>
        )}
      </Importer>
    </Modal>
  );
}
