import { UrlUtils } from "./url";

export class Features {
  public static areFriendsEnabled(): boolean {
    if (typeof window !== "undefined" && window?.document?.location?.href) {
      const url = UrlUtils.build(window.document.location.href);
      return !!url.searchParams.get("friends");
    } else {
      return false;
    }
  }
}
