import { gzip, gunzip } from "fflate";

export class Encoder {
  public static async encodeIntoUrl(str: string): Promise<void> {
    const base64data = await Encoder.encode(str);
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set("data", base64data);
    const url = new URL(window.location.href);
    url.search = urlParams.toString();
    window.history.replaceState({ path: url.toString() }, "", url.toString());
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
      const dataUrl = atob(str);
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const uintarray = await blob.arrayBuffer();
      gunzip(new Uint8Array(uintarray), (err, result) => {
        const textDecoder = new TextDecoder("utf-8");
        resolve(textDecoder.decode(result));
      });
    });
  }
}
