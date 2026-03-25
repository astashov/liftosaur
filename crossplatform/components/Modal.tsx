import type React from "react";
import type { JSX } from "react";
import { View, Pressable, Modal as RNModal, ScrollView } from "react-native";
import { IconCloseCircleOutline } from "./icons/IconCloseCircleOutline";

interface IProps {
  name?: string;
  children: React.ReactNode;
  isHidden?: boolean;
  isFullWidth?: boolean;
  isFullHeight?: boolean;
  noPaddings?: boolean;
  shouldShowClose?: boolean;
  onClose?: () => void;
}

export function Modal(props: IProps): JSX.Element | null {
  if (props.isHidden) {
    return null;
  }

  return (
    <RNModal visible={!props.isHidden} transparent animationType="fade" onRequestClose={props.onClose}>
      <View className="flex-1 items-center justify-center">
        <Pressable
          className="absolute inset-0 bg-black/50"
          onPress={props.shouldShowClose ? props.onClose : undefined}
        />
        <View
          className={`bg-background-default rounded-lg shadow-lg ${props.noPaddings ? "" : "py-6"} w-[92%] max-h-[90%] ${props.isFullHeight ? "h-[90%]" : ""}`}
        >
          <ScrollView className={props.noPaddings ? "" : "px-6"}>{props.children}</ScrollView>
          {props.shouldShowClose && (
            <Pressable
              className="absolute p-2"
              style={{ top: -3, right: -3 }}
              onPress={props.onClose}
              data-cy={`modal-close${props.name ? `-${props.name}` : ""}`}
            >
              <IconCloseCircleOutline />
            </Pressable>
          )}
        </View>
      </View>
    </RNModal>
  );
}
