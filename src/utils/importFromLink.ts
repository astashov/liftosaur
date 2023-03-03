import { IEither } from "./types";
import { Encoder } from "./encoder";
import { Service } from "../api/service";

export namespace ImportFromLink {
  export async function importFromLink(link: string, client: Window["fetch"]): Promise<IEither<string, string[]>> {
    const url = new URL(link);
    let base64 = url.searchParams.get("data") || undefined;
    if (base64) {
      return getDecodedData(base64);
    } else {
      const [type, id] = url.pathname.split("/").filter((p) => p);
      if (type === "p" && id) {
        const service = new Service(client);
        base64 = await service.getDataFromShortUrl(id);
        if (base64) {
          return getDecodedData(base64);
        }
      }
    }
    return { success: false, error: ["No data found"] };
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
