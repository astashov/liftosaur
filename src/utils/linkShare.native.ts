import { Share } from "react-native";

export async function LinkShare_share(args: { url: string; message: string }): Promise<"shared" | "copied" | "failed"> {
  try {
    await Share.share({ message: `${args.message} ${args.url}`, url: args.url });
    return "shared";
  } catch (e) {
    return "failed";
  }
}
