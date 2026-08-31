import { JSX } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { KeyboardSheet } from "../KeyboardSheet";
import { Modal_clear, Modal_setResult, useModalData, useModalDispatch } from "../ModalStateContext";
import { LiftoEditorStateVarsSheet } from "../../components/liftoEditorStateVarsSheet";

export function NavModalStateVars(): JSX.Element {
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const { state } = useAppState();
  const data = useModalData("stateVarsModal");

  const onClose = (): void => {
    Modal_clear(modalDispatch, "stateVarsModal");
    navigation.goBack();
  };

  if (!data) {
    return <></>;
  }

  return (
    <KeyboardSheet header="State Variables" onClose={onClose}>
      <View className="px-4 pb-4 bg-background-default">
        <LiftoEditorStateVarsSheet
          entries={data.entries}
          hasUnparsed={data.hasUnparsed}
          defaults={data.defaults}
          defaultsMetadata={data.defaultsMetadata}
          sourceName={data.sourceName}
          progressScript={data.progressScript}
          updateScript={data.updateScript}
          exerciseType={data.exerciseType}
          settings={state.storage.settings}
          onDone={(args) => {
            Modal_setResult(modalDispatch, "stateVarsModal", args);
            Modal_clear(modalDispatch, "stateVarsModal");
            navigation.goBack();
          }}
        />
      </View>
    </KeyboardSheet>
  );
}
