import { Alert } from "react-native";
import RNFS from "react-native-fs";
import Share from "react-native-share";

function mimeTypeFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".json")) {
    return "application/json";
  }
  if (lower.endsWith(".csv")) {
    return "text/csv";
  }
  return "text/plain";
}

export function Exporter_toFile(filename: string, contents: string): void {
  exportToFile(filename, contents);
}

async function exportToFile(filename: string, contents: string): Promise<void> {
  const tempPath = `${RNFS.CachesDirectoryPath}/${filename}`;
  try {
    await RNFS.writeFile(tempPath, contents, "utf8");
    await Share.open({
      url: `file://${tempPath}`,
      type: mimeTypeFromFilename(filename),
      filename,
      failOnCancel: false,
    });
  } catch (e) {
    const err = e as { message?: string };
    if (err.message && /cancel|cancelled|user did not share/i.test(err.message)) {
      return;
    }
    Alert.alert("Export failed", err.message ?? "Unknown error");
  } finally {
    try {
      if (await RNFS.exists(tempPath)) {
        await RNFS.unlink(tempPath);
      }
    } catch {}
  }
}
