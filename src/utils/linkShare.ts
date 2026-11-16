import { ClipboardUtils_copy } from "./clipboard";

export async function LinkShare_share(args: { url: string; message: string }): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ text: args.message, url: args.url });
      return "shared";
    } catch (e) {
      return "failed";
    }
  }
  ClipboardUtils_copy(args.url);
  return "copied";
}
