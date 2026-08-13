import { JSX } from "react";
import { Animated, Platform, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { FormSheet } from "../FormSheet";
import { CustomKeyboardProvider, useCustomKeyboardAnimatedHeight } from "../CustomKeyboardContext";
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

  const content = (
    <CustomKeyboardProvider applySafeAreaBottom={false} inline noShadow>
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
      <KeyboardSpacer />
    </CustomKeyboardProvider>
  );

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <FormSheet header="State Variables" noPadding>
        {content}
      </FormSheet>
    </SheetScreenContainer>
  );
}

function KeyboardSpacer(): JSX.Element {
  const animatedHeight = useCustomKeyboardAnimatedHeight();
  if (Platform.OS === "android") {
    return <></>;
  }
  return <Animated.View style={{ height: animatedHeight }} />;
}
