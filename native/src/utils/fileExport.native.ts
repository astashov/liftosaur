import Share from "react-native-share";

export async function FileExport_share(filename: string, contents: string): Promise<void> {
  const bytes = new TextEncoder().encode(contents);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const ext = filename.split(".").pop() || "txt";
  const mimeMap: Record<string, string> = { json: "application/json", csv: "text/csv", txt: "text/plain" };
  const mime = mimeMap[ext] ?? "text/plain";
  await Share.open({ url: `data:${mime};base64,${base64}`, filename, type: mime });
}
