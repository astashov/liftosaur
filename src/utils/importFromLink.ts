import { IEither } from "./types";
import { Encoder } from "./encoder";
import { Service } from "../api/service";

export namespace ImportFromLink {
  export async function importFromLink(
    link: string,
    client: Window["fetch"]
  ): Promise<IEither<{ decoded: string; source?: string }, string[]>> {
    const url = new URL(link);
    let base64 = url.searchParams.get("data") || undefined;
    let source = url.searchParams.get("s") || undefined;
    let decoded;
    if (base64) {
      decoded = await getDecodedData(base64);
    } else {
      const [type, id] = url.pathname.split("/").filter((p) => p);
      if (type === "p" && id) {
        const service = new Service(client);
        const result = await service.getDataFromShortUrl(id);
        base64 = result.data;
        source = source || result.s;
        if (base64) {
          decoded = await getDecodedData(base64);
        }
      }
    }
    if (decoded) {
      if (decoded.success) {
        return { success: true, data: { decoded: decoded.data, source } };
      } else {
        return decoded;
      }
    } else {
      return { success: false, error: ["No data found"] };
    }
  }
}

async function getDecodedData(base64: string): Promise<IEither<string, string[]>> {
  try {
    const decoded = await Encoder.decode(base64);
    return { success: true, data: decoded };
  } catch (e) {
    return { success: false, error: ["Error decoding the link"] };
  }
}
