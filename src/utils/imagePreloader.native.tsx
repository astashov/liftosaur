import { Image } from "react-native";
import { HostConfig_resolveUrl } from "./hostConfig";

const cache: Map<string, string> = new Map();

async function fetchAsDataUri(url: string): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }
  const blob = await resp.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function ImagePreloader_preload(path: string): Promise<boolean> {
  if (cache.has(path)) {
    return true;
  }
  const resolved = HostConfig_resolveUrl(path);
  Image.prefetch(resolved).catch(() => false);
  try {
    const dataUri = await fetchAsDataUri(resolved);
    cache.set(path, dataUri);
    return true;
  } catch {
    return false;
  }
}

export function ImagePreloader_uri(path: string): string {
  return cache.get(path) ?? HostConfig_resolveUrl(path);
}

export function ImagePreloader_clear(): void {
  cache.clear();
}

export const ImagePreloader_dynocoach: string = "/images/dinocoach.svg";

export const ImagePreloader_dynoflex: string = "/images/dinoflex.svg";

export const ImagePreloader_dynohappy: string = "/images/dinohappy.svg";

export const ImagePreloader_images: Record<string, unknown> = {};
