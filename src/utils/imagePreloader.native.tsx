import { Image } from "react-native";

export function ImagePreloader_preload(url: string): Promise<boolean> {
  return Image.prefetch(url).catch(() => false);
}

export const ImagePreloader_dynocoach: string = "/images/dinocoach.svg";

export const ImagePreloader_dynoflex: string = "/images/dinoflex.svg";

export const ImagePreloader_dynohappy: string = "/images/dinohappy.svg";

export const ImagePreloader_images: Record<string, unknown> = {};
