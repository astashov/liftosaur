import { ActionSheetIOS } from "react-native";

export interface IActionSheetOptions {
  title?: string;
  options: string[];
  cancelButtonIndex?: number;
  destructiveButtonIndex?: number;
}

export function ActionSheet_show(options: IActionSheetOptions, callback: (buttonIndex?: number) => void): void {
  ActionSheetIOS.showActionSheetWithOptions(options, callback);
}
