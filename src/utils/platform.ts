export class Platform {
  public static isiOS(userAgent?: string): boolean {
    userAgent = userAgent || (typeof window !== "undefined" && window.navigator ? window.navigator.userAgent : "");
    console.log(userAgent);
    return /iPhone|iPad|iPod/i.test(userAgent);
  }

  public static isAndroid(userAgent?: string): boolean {
    userAgent = userAgent || (typeof window !== "undefined" && window.navigator ? window.navigator.userAgent : "");
    console.log(userAgent);
    return /Android/i.test(userAgent);
  }
}
