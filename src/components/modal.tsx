import React, { JSX, RefObject } from "react";
import { View, TouchableOpacity, ScrollView, DimensionValue, Modal, StyleSheet } from "react-native";
import { IconCloseCircleOutline } from "./icons/iconCloseCircleOutline";

interface IProps {
  name?: string;
  children: React.ReactNode;
  autofocusInputRef?: RefObject<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>;
  preautofocus?: [RefObject<HTMLElement>, (el: HTMLElement) => void][];
  isHidden?: boolean;
  isFullWidth?: boolean;
  noPaddings?: boolean;
  shouldShowClose?: boolean;
  overflowHidden?: boolean;
  innerClassName?: string;
  maxWidth?: DimensionValue;
  style?: Record<string, string | undefined>;
  onClose?: () => void;
}

export function LftModal(props: IProps): JSX.Element {
  const [isHidden, setIsHidden] = React.useState(props.isHidden ?? false);

  return (
    <Modal animationType="fade" visible={!isHidden} transparent={true} onRequestClose={props.onClose}>
      <TouchableOpacity
        data-name="overlay"
        onPress={props.shouldShowClose ? props.onClose : undefined}
        style={{ ...StyleSheet.absoluteFillObject }}
        className="z-10 opacity-50 bg-grayv2-700"
      />

      <View className="items-center justify-center flex-1">
        <View
          data-name="modal"
          data-cy={`modal${props.name ? `-${props.name}` : ""}`}
          className={`relative z-20 flex flex-row ${props.noPaddings ? "" : "py-6"} bg-white rounded-lg shadow-lg`}
          style={{
            maxWidth: props.maxWidth ?? "85%",
            maxHeight: "90%",
            width: props.isFullWidth ? "85%" : "auto",
            ...props.style,
          }}
        >
          <ScrollView
            className={`relative h-full ${props.noPaddings ? "" : "px-6"} ${
              props.overflowHidden ? "overflow-hidden" : "overflow-auto"
            } ${props.innerClassName}`}
          >
            {props.children}
          </ScrollView>
          {props.shouldShowClose && (
            <TouchableOpacity
              data-cy={`modal-close${props.name ? `-${props.name}` : ""}`}
              onPress={() => {
                setIsHidden(true);
                if (props.onClose) {
                  props.onClose();
                }
              }}
              className="absolute p-2 nm-modal-close"
              style={{ top: -3, right: -3 }}
            >
              <IconCloseCircleOutline />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
