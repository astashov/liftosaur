import { ImageSourcePropType } from "react-native";
import { HostConfig_resolveUrl } from "./hostConfig";

export function BundledImages_resolve(path: string): ImageSourcePropType {
  return { uri: HostConfig_resolveUrl(path) };
}

export function BundledImages_svgXml(_path: string): string | undefined {
  return undefined;
}
