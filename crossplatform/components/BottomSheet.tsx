import type React from "react";
import type { JSX } from "react";
import { View, Pressable, Modal as RNModal, ScrollView } from "react-native";
import { IconCloseCircleOutline } from "./icons/IconCloseCircleOutline";

interface IProps {
  isHidden: boolean;
  shouldShowClose?: boolean;
  children?: React.ReactNode;
  onClose: () => void;
}

export function BottomSheet(props: IProps): JSX.Element | null {
  if (props.isHidden) {
    return null;
  }

  return (
    <RNModal visible={!props.isHidden} transparent animationType="slide" onRequestClose={props.onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/50" onPress={props.onClose} />
        <View
          className="bg-background-default"
          style={{
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: "90%",
          }}
        >
          {props.shouldShowClose && (
            <Pressable className="absolute top-0 right-0 z-10 p-2" onPress={props.onClose} data-cy="bottom-sheet-close">
              <IconCloseCircleOutline size={28} />
            </Pressable>
          )}
          <View className="items-center pt-2 pb-1">
            <View className="w-8 rounded-sm bg-gray-300" style={{ height: 3 }} />
          </View>
          <ScrollView style={{ maxHeight: "85%" }}>{props.children}</ScrollView>
        </View>
      </View>
    </RNModal>
  );
}
