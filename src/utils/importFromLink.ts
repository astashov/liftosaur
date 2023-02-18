import { IEither } from "./types";
import { Encoder } from "./encoder";

export async function importFromLink(link: string): Promise<IEither<string, string[]>> {
  const url = new URL(link);
  const base64 = url.searchParams.get("data") || undefined;
  if (base64) {
    try {
      const decoded = await Encoder.decode(base64);
      return { success: true, data: decoded };
    } catch (e) {
      return { success: false, error: ["Error decoding the link"] };
    }
  }
  return { success: false, error: ["No data found"] };
}
