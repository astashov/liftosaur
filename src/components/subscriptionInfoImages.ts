import { Platform } from "react-native";

export type ISubscriptionInfoType = "platesCalculator" | "graphs" | "notifications" | "weekInsights" | "watch" | "mcp";

export interface ISubscriptionInfoImage {
  uri: string;
  aspect: number;
}

export function SubscriptionInfoImages_get(type: ISubscriptionInfoType): ISubscriptionInfoImage {
  switch (type) {
    case "platesCalculator":
      return { uri: "/images/plates_calculator_subs.png", aspect: 732 / 937 };
    case "graphs":
      return { uri: "/images/graphs_subs.png", aspect: 724 / 974 };
    case "notifications":
      return Platform.OS === "android"
        ? { uri: "/images/notifs_subs_android.jpg", aspect: 750 / 1069 }
        : { uri: "/images/notifs_subs_ios.jpg", aspect: 750 / 1069 };
    case "weekInsights":
      return { uri: "/images/week_insights_subs.png", aspect: 732 / 962 };
    case "watch":
      return { uri: "/images/watch_subs_ios.png", aspect: 750 / 1070 };
    case "mcp":
      return { uri: "/images/mcp_subs.png", aspect: 750 / 1070 };
  }
}

export function SubscriptionInfoImages_allPaths(): string[] {
  const types: ISubscriptionInfoType[] = [
    "platesCalculator",
    "graphs",
    "notifications",
    "weekInsights",
    "watch",
    "mcp",
  ];
  return types.map((t) => SubscriptionInfoImages_get(t).uri);
}
