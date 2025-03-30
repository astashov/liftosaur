export namespace Mobile {
  export function isMobileFromWindow(): boolean {
    return typeof window !== "undefined" && window.navigator ? isMobile(window.navigator.userAgent) : false;
  }

  export function isMobile(userAgent: string): boolean {
    return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  }

  export function isPlaywrightFromWindow(): boolean {
    return typeof window !== "undefined" && window.navigator ? isPlaywright(window.navigator.userAgent) : false;
  }

  export function isPlaywright(userAgent: string): boolean {
    return userAgent.includes("Playwright");
  }
}
