export class Features {
  public static areFriendsEnabled(): boolean {
    if (window?.document?.location?.href) {
      const url = new URL(window.document.location.href);
      return !!url.searchParams.get("friends");
    } else {
      return false;
    }
  }
}
