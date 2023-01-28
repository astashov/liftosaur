import { gunzip } from "fflate";

export class NodeEncoder {
  public static decode(data: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const buffer = Buffer.from(data, "base64");
        const dataUrl = buffer.toString("utf-8");
        const base64 = dataUrl.split(",")[1];
        if (base64) {
          const buffer2 = Buffer.from(base64, "base64");
          gunzip(buffer2, (err, result) => {
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
