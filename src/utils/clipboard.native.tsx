import { Alert } from "react-native";

export async function ClipboardUtils_paste(): Promise<string | undefined> {
  return undefined;
}

export async function ClipboardUtils_copy(text: string): Promise<void> {
  Alert.alert("Copy this value", text, [{ text: "OK" }]);
}

export async function ClipboardUtils_canReadTextFromClipboard(): Promise<boolean> {
  return false;
}
