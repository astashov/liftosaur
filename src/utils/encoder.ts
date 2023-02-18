import { gzip, gunzip } from "fflate";

export class Encoder {
  public static async encodeIntoUrlAndSetUrl(str: string): Promise<void> {
    const url = await Encoder.encodeIntoUrl(str, window.location.href);
    window.history.replaceState({ path: url.toString() }, "", url.toString());
  }

  public static async encodeIntoUrl(str: string, base: string): Promise<URL> {
    const base64data = await Encoder.encode(str);
    const url = new URL(base);
    const urlParams = new URLSearchParams(url.search);
    urlParams.set("data", base64data);
    url.search = urlParams.toString();
    return url;
  }

  public static encode(str: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const textEncoder = new TextEncoder();
      gzip(textEncoder.encode(str), (err, result) => {
        const reader = new FileReader();
        reader.onload = function () {
          const b64 = reader.result;
          if (typeof b64 === "string") {
            resolve(btoa(b64));
          }
        };
        reader.readAsDataURL(new Blob([result]));
      });
    });
  }

  public static decode(str: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const dataUrl = atob(str);
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const uintarray = await blob.arrayBuffer();
        const result = await gunzipPromise(new Uint8Array(uintarray));
        const textDecoder = new TextDecoder("utf-8");
        resolve(textDecoder.decode(result));
      } catch (e) {
        reject(e);
      }
    });
  }
}

function gunzipPromise(data: Uint8Array): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    gunzip(data, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}
