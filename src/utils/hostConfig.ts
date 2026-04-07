import { Platform } from "react-native";

// Toggle these for local development on native:
const baseHost = "https://local.liftosaur.com:8080";
// const baseHost = "https://stage.liftosaur.com";
// const baseHost = "https://www.liftosaur.com";

export function HostConfig_imageHost(): string {
  if (Platform.OS === "web") {
    return "";
  }
  return baseHost;
}

export function HostConfig_resolveUrl(path: string): string {
  if (Platform.OS === "web" || !path.startsWith("/")) {
    return path;
  }
  return `${baseHost}${path}`;
}
