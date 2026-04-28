export interface IActionSheetOptions {
  title?: string;
  options: string[];
  cancelButtonIndex?: number;
  destructiveButtonIndex?: number;
}

export function ActionSheet_show(_options: IActionSheetOptions, _callback: (buttonIndex?: number) => void): void {}
