import { Dialog_alert } from "./dialog";

export async function ClipboardUtils_paste(): Promise<string | undefined> {
  return undefined;
}

export async function ClipboardUtils_copy(text: string): Promise<void> {
  Dialog_alert("Copy this value\n\n" + text);
}

export async function ClipboardUtils_canReadTextFromClipboard(): Promise<boolean> {
  return false;
}
