import { JSX, useCallback } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { GroupHeader } from "./groupHeader";
import { MenuItemWrapper } from "./menuItem";
import { IDispatch } from "../ducks/types";
import { Thunk_importHevyData } from "../ducks/thunks";
import { ISettings } from "../types";
import { FileImport_pickFile } from "../utils/fileImport";

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
    props.onClose();
    // The pushed screen inherits the modal's bounded container if navigation happens before the
    // modal finishes closing, so delay the dispatch
    setTimeout(() => props.dispatch(Thunk_importHevyData(contents)), 50);
  }, [props.dispatch, props.onClose]);

  return (
    <View>
      <GroupHeader size="large" name="Import history from other apps" />
      <MenuItemWrapper name="Upload CSV file from Hevy" onClick={onUploadHevy}>
        <Text className="py-3">Upload CSV file from Hevy</Text>
      </MenuItemWrapper>
    </View>
  );
}
