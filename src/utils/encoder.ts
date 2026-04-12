import { gzip, gunzip, gunzipSync } from "fflate";
import { Platform } from "react-native";
import { UrlUtils_build } from "./url";

export async function Encoder_encodeIntoUrlAndSetUrl(str: string): Promise<void> {
  const url = await Encoder_encodeIntoUrl(str, window.location.href);
  window.history.replaceState({ path: url.toString() }, "", url.toString());
}

export async function Encoder_encodeIntoUrl(str: string, base: string): Promise<URL> {
  const base64data = await Encoder_encode(str.replace("liftosaur://", "https://"));
  const url = UrlUtils_build(base);
  const urlParams = new URLSearchParams(url.search);
  urlParams.set("data", base64data);
  url.search = urlParams.toString();
  return url;
}

export function Encoder_encode(str: string): Promise<string> {
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

export function Encoder_decode(str: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const dataUrl = atob(str);
      let uintarray: Uint8Array;
      if (Platform.OS === "web") {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        uintarray = new Uint8Array(await blob.arrayBuffer());
      } else {
        // RN: fetch doesn't support data: URLs, decode base64 directly
        const b64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
        const binary = atob(b64);
        uintarray = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          uintarray[i] = binary.charCodeAt(i);
        }
      }
      const result = Platform.OS === "web" ? await gunzipPromise(uintarray) : gunzipSync(uintarray);
      if (typeof TextDecoder !== "undefined") {
        resolve(new TextDecoder("utf-8").decode(result));
      } else {
        let str2 = "";
        for (let i = 0; i < result.length; i++) {
          str2 += String.fromCharCode(result[i]);
        }
        resolve(decodeURIComponent(escape(str2)));
      }
    } catch (e) {
      reject(e);
    }
  });
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
