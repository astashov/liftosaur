import { Alert } from "react-native";
import { pick, types } from "@react-native-documents/picker";
import RNFS from "react-native-fs";

export type IFileImportType = "json" | "csv" | "any";

export async function FileImport_pickFile(fileType: IFileImportType = "any"): Promise<string | undefined> {
  try {
    const acceptedTypes =
      fileType === "csv"
        ? [types.csv, types.plainText]
        : fileType === "json"
          ? [types.json, types.plainText]
          : [types.allFiles];
    const [result] = await pick({ type: acceptedTypes, allowMultiSelection: false });
    if (!result?.uri) {
      return undefined;
    }
    return await RNFS.readFile(decodeURIComponent(result.uri), "utf8");
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "DOCUMENT_PICKER_CANCELED" || err.code === "OPERATION_CANCELED") {
      return undefined;
    }
    Alert.alert("Import failed", err.message ?? "Unknown error");
    return undefined;
  }
}

export async function FileImport_confirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert("Confirm", message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "OK", onPress: () => resolve(true) },
    ]);
  });
}
