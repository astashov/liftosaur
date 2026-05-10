import { JSX, useCallback } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { GroupHeader } from "./groupHeader";
import { MenuItemWrapper } from "./menuItem";
import { ImportFromHevy_convertHevyCsvToHistoryRecords } from "../utils/importFromHevy";
import { IDispatch } from "../ducks/types";
import { IState, updateState } from "../models/state";
import { lb } from "lens-shmens";
import { CollectionUtils_sortBy, CollectionUtils_uniqBy } from "../utils/collection";
import RB from "rollbar";
import { ICustomExercise, IHistoryRecord, ISettings } from "../types";
import { Dialog_alert, Dialog_confirm } from "../utils/dialog";
import { FileImport_pickFile } from "../utils/fileImport";

declare let Rollbar: RB;

interface IModalImportFromOtherAppsContentProps {
  settings: ISettings;
  onClose: () => void;
  dispatch: IDispatch;
}

export function ModalImportFromOtherAppsContent(props: IModalImportFromOtherAppsContentProps): JSX.Element {
  const onUploadHevy = useCallback(async () => {
    const contents = await FileImport_pickFile("csv");
    if (contents == null) {
      return;
    }
    let historyRecords: IHistoryRecord[];
    let customExercises: Record<string, ICustomExercise>;
    try {
      const result = ImportFromHevy_convertHevyCsvToHistoryRecords(contents, props.settings);
      historyRecords = result.historyRecords;
      customExercises = result.customExercises;
    } catch (error) {
      const e = error as Error;
      console.error(e);
      Rollbar.error(e);
      historyRecords = [];
      customExercises = {};
      Dialog_alert("Failed to import history from Hevy.");
    }
    if (historyRecords.length > 0) {
      if (await Dialog_confirm(`Do you want to import ${historyRecords.length} workouts?`)) {
        updateState(
          props.dispatch,
          [
            lb<IState>()
              .p("storage")
              .p("history")
              .recordModify((oldHistoryRecords) => {
                return CollectionUtils_sortBy(
                  CollectionUtils_uniqBy(oldHistoryRecords.concat(historyRecords), "id"),
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
          ],
          "Import Hevy workouts"
        );
      }
    }
    props.onClose();
  }, [props.settings, props.dispatch, props.onClose]);

  return (
    <View>
      <GroupHeader size="large" name="Import history from other apps" />
      <MenuItemWrapper name="Upload CSV file from Hevy" onClick={onUploadHevy}>
        <Text className="py-3">Upload CSV file from Hevy</Text>
      </MenuItemWrapper>
    </View>
  );
}
