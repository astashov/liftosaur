import { gunzip, gzip } from "fflate";
import { UrlUtils } from "../../src/utils/url";

export class NodeEncoder {
  public static async encodeIntoUrl(str: string, base: string): Promise<URL> {
    const base64data = await NodeEncoder.encode(str.replace("liftosaur://", "https://"));
    const url = UrlUtils.build(base);
    const urlParams = new URLSearchParams(url.search);
    urlParams.set("data", base64data);
    url.search = urlParams.toString();
    return url;
  }

  public static encode(str: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const textEncoder = new TextEncoder();
      gzip(textEncoder.encode(str), (err, result) => {
        if (!err) {
          resolve(
            Buffer.from(`data:application/octet-stream;base64,${Buffer.from(result).toString("base64")}`).toString(
              "base64"
            )
          );
        } else {
          reject(err);
        }
      });
    });
  }

  public static decode(data: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const buffer = Buffer.from(data, "base64");
        const dataUrl = buffer.toString("utf-8");
        const base64 = dataUrl.split(",")[1];
        if (base64) {
          const buffer2 = Buffer.from(base64, "base64");
          gunzip(buffer2 as unknown as Uint8Array, (err, result) => {
            if (err) {
              reject(err);
            } else {
              const buffer3 = Buffer.from(result);
              const str = buffer3.toString("utf-8");
              resolve(str);
            }
          });
        } else {
          reject(new Error("Malformed base64 data"));
        }
      } catch (e) {
        reject(e);
      }
    });
  }
}
