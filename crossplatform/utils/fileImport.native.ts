import { pick, types as docTypes } from "@react-native-documents/picker";
import { Alert } from "react-native";
import NativeLiftosaurStorage from "../../native/src/native/NativeLiftosaurStorage";

export { docTypes };

export async function FileImport_pickAndRead(fileTypes: string[]): Promise<string | undefined> {
  try {
    console.log("[FileImport] picking file, types:", fileTypes);
    const [result] = await pick({ type: fileTypes });
    console.log("[FileImport] picked:", result.uri, "name:", result.name, "size:", result.size);
    console.log("[FileImport] reading via native module");
    const text = await NativeLiftosaurStorage.readFile(result.uri);
    if (text == null) {
      throw new Error("Native readFile returned null");
    }
    console.log("[FileImport] read success, length:", text.length);
    return text;
  } catch (e: unknown) {
    console.log("[FileImport] error:", e);
    if (e != null && typeof e === "object" && "code" in e && e.code !== "DOCUMENT_PICKER_CANCELED") {
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
