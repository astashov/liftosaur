import { ImageSourcePropType } from "react-native";
import { HostConfig_resolveUrl } from "./hostConfig";
import { bundledSvg } from "./bundledImagesSvg";

const bundledRaster: Record<string, ImageSourcePropType> = {
  "/images/slide-1-bg.jpg": require("../../assets/bundledImages/slide-1-bg.jpg"),
  "/images/slide-2-image.png": require("../../assets/bundledImages/slide-2-image.png"),
  "/images/slide-3-image.png": require("../../assets/bundledImages/slide-3-image.png"),
  "/images/slide-4-image.png": require("../../assets/bundledImages/slide-4-image.png"),
  "/images/slide-5-image.png": require("../../assets/bundledImages/slide-5-image.png"),
};

export function BundledImages_resolve(path: string): ImageSourcePropType {
  return bundledRaster[path] ?? { uri: HostConfig_resolveUrl(path) };
}

export function BundledImages_svgXml(path: string): string | undefined {
  return bundledSvg[path];
}
