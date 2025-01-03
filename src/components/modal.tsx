import React, { JSX, RefObject } from "react";
import { useRef, useEffect } from "react";
import { View, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
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
  maxWidth?: string;
  style?: Record<string, string | undefined>;
  onClose?: () => void;
}

export function Modal(props: IProps): JSX.Element {
  const modalRef = useRef<View>(null);

  let className = "inset-0 flex flex-row items-center justify-center web:fixed ios:absolute";
  if (props.isHidden) {
    className += " invisible";
  }

  const prevProps = useRef<IProps>(props);
  useEffect(() => {
    prevProps.current = props;
  });

  useEffect(() => {
    if (!props.isHidden) {
      // Add logic to stop scrolling in React Native if needed
    } else {
      // Add logic to enable scrolling in React Native if needed
    }
    return () => {
      // Add cleanup logic for scrolling in React Native if needed
    };
  }, [props.isHidden]);

  if (modalRef.current != null && prevProps.current!.isHidden && !props.isHidden) {
    for (const [ref, callback] of props.preautofocus ?? []) {
      if (ref.current != null) {
        callback(ref.current);
      }
    }
    if (props.autofocusInputRef?.current != null) {
      modalRef.current.classList.remove("invisible");
      props.autofocusInputRef.current.focus();
    }
  }

  return (
    <View ref={modalRef} className={className} style={{ zIndex: 100 }}>
      <TouchableOpacity
        data-name="overlay"
        onPress={props.shouldShowClose ? props.onClose : undefined}
        style={{ ...StyleSheet.absoluteFillObject }}
        className="z-10 opacity-50 bg-grayv2-700"
      />
      <View
        data-name="modal"
        data-cy={`modal${props.name ? `-${props.name}` : ""}`}
        className={`relative z-20 flex flex-col ${props.noPaddings ? "" : "py-6"} bg-white rounded-lg shadow-lg`}
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
            onPress={props.onClose}
            className="absolute p-2 nm-modal-close"
            style={{ top: -3, right: -3 }}
          >
            <IconCloseCircleOutline />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
