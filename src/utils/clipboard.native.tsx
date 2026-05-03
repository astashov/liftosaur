import Clipboard from "@react-native-clipboard/clipboard";

export async function ClipboardUtils_paste(): Promise<string | undefined> {
  const text = await Clipboard.getString();
  return text === "" ? undefined : text;
}

export async function ClipboardUtils_copy(text: string): Promise<void> {
  Clipboard.setString(text);
}

export async function ClipboardUtils_canReadTextFromClipboard(): Promise<boolean> {
  return Clipboard.hasString();
}
