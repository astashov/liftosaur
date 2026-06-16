import { pick, types } from "@react-native-documents/picker";
import { Platform } from "react-native";
import RNFS from "react-native-fs";
import { Dialog_alert, Dialog_confirm } from "./dialog";

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
    // Android returns a percent-encoded content:// uri whose temporary read grant is keyed to that exact
    // string - decoding it makes ContentResolver reject the read ("requires ACTION_OPEN_DOCUMENT"), so pass
    // it through untouched. iOS returns a file:// uri, but RNFS expects a decoded plain path there.
    const path = Platform.OS === "android" ? result.uri : decodeURIComponent(result.uri).replace(/^file:\/\//, "");
    return await RNFS.readFile(path, "utf8");
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "DOCUMENT_PICKER_CANCELED" || err.code === "OPERATION_CANCELED") {
      return undefined;
    }
    Dialog_alert("Import failed: " + (err.message ?? "Unknown error"));
    return undefined;
  }
}

export async function FileImport_confirm(message: string): Promise<boolean> {
  return Dialog_confirm(message);
}
