import { Platform } from "react-native";

function baseHost(): string {
  return (globalThis as { __HOST__?: string }).__HOST__ ?? "https://www.liftosaur.com";
}

export function HostConfig_imageHost(): string {
  if (Platform.OS === "web") {
    return "";
  }
  return baseHost();
}

export function HostConfig_resolveUrl(path: string): string {
  if (Platform.OS === "web" || !path.startsWith("/")) {
    return path;
  }
  return `${baseHost()}${path}`;
}
