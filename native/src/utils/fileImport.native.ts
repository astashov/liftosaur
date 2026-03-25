import { pick, types as docTypes } from "react-native-document-picker";
import { Alert } from "react-native";

export { docTypes };

export async function FileImport_pickAndRead(fileTypes: string[]): Promise<string | undefined> {
  try {
    const [result] = await pick({ type: fileTypes });
    const response = await fetch(result.uri);
    return await response.text();
  } catch (e: any) {
    if (e?.code !== "DOCUMENT_PICKER_CANCELED") {
      Alert.alert("Error", "Could not read the selected file");
    }
    return undefined;
  }
}

export function FileImport_confirm(title: string, message: string, onConfirm: () => void): void {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Import", style: "destructive", onPress: onConfirm },
  ]);
}
