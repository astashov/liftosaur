import { gzip, gunzip } from "fflate";
import { UrlUtils } from "./url";

export class Encoder {
  public static async encodeIntoUrlAndSetUrl(str: string): Promise<void> {
    const url = await Encoder.encodeIntoUrl(str, window.location.href);
    window.history.replaceState({ path: url.toString() }, "", url.toString());
  }

  public static async encodeIntoUrl(str: string, base: string): Promise<URL> {
    const base64data = await Encoder.encode(str.replace("liftosaur://", "https://"));
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
        if (err) {
          reject(err);
          return;
        }
        if (typeof FileReader !== "undefined") {
          const reader = new FileReader();
          reader.onload = function () {
            const b64 = reader.result;
            if (typeof b64 === "string") {
              resolve(btoa(b64));
            }
          };
          reader.readAsDataURL(new Blob([result]));
        } else {
          let binary = "";
          for (let i = 0; i < result.length; i++) {
            binary += String.fromCharCode(result[i]);
          }
          const b64 = btoa(binary);
          const dataUrl = `data:application/octet-stream;base64,${b64}`;
          resolve(btoa(dataUrl));
        }
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
