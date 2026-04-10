import { JSX, ReactNode } from "react";
import { ScrollView } from "react-native";

interface IProps {
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
  isFullWidth?: boolean;
  isFullHeight?: boolean;
  noPaddings?: boolean;
  overflowHidden?: boolean;
  innerClassName?: string;
  shouldShowClose?: boolean;
}

export function ModalScreenContainer(props: IProps): JSX.Element {
  return (
    <ScrollView
      className={`bg-background-default ${props.noPaddings ? "" : "px-4 pt-2 pb-6"}`}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      {props.children}
    </ScrollView>
  );
}
