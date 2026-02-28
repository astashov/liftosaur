import { IEither } from "./types";
import { Encoder_decode } from "./encoder";
import { Service } from "../api/service";
import { UrlUtils_build } from "./url";

export interface IImportLinkData {
  decoded: string;
  source?: string;
  userid?: string;
}

export async function ImportFromLink_importFromLink(
  link: string,
  client: Window["fetch"]
): Promise<IEither<{ decoded: string; source?: string; userid?: string }, string[]>> {
  let url: URL;
  try {
    url = UrlUtils_build(link);
  } catch (e) {
    return { success: false, error: ["Invalid link"] };
  }
  let base64 = url.searchParams.get("data") || undefined;
  let source = url.searchParams.get("s") || undefined;
  let userid = url.searchParams.get("u") || undefined;
  let decoded;
  if (base64) {
    decoded = await getDecodedData(base64);
  } else {
    const [type, id] = url.pathname.split("/").filter((p) => p);
    if ((type === "p" || type === "n") && id) {
      const service = new Service(client);
      const result = await service.getDataFromShortUrl(type, id);
      base64 = result.data;
      source = source || result.s;
      userid = userid || result.u;
      if (base64) {
        decoded = await getDecodedData(base64);
      }
    }
  }
  if (decoded) {
    if (decoded.success) {
      return { success: true, data: { decoded: decoded.data, source, userid } };
    } else {
      return decoded;
    }
  } else {
    return { success: false, error: ["No data found"] };
  }
}

async function getDecodedData(base64: string): Promise<IEither<string, string[]>> {
  try {
    const decoded = await Encoder_decode(base64);
    return { success: true, data: decoded };
  } catch (e) {
    return { success: false, error: ["Error decoding the link"] };
  }
}
