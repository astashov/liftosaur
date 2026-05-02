import { ActionSheetIOS, Platform } from "react-native";

export interface IActionSheetOptions {
  title?: string;
  options: string[];
  cancelButtonIndex?: number;
  destructiveButtonIndex?: number;
}

export interface IActionSheetRequest {
  options: IActionSheetOptions;
  callback: (buttonIndex?: number) => void;
}

type IListener = (request: IActionSheetRequest | null) => void;
let currentListener: IListener | null = null;

export function ActionSheet_subscribe(listener: IListener): () => void {
  currentListener = listener;
  return () => {
    if (currentListener === listener) {
      currentListener = null;
    }
  };
}

export function ActionSheet_show(options: IActionSheetOptions, callback: (buttonIndex?: number) => void): void {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(options, callback);
    return;
  }
  if (currentListener) {
    currentListener({ options, callback });
  }
}
