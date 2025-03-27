export namespace Mobile {
  export function isMobile(userAgent: string): boolean {
    console.log("User agent", userAgent);
    return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  }

  export function isPlaywright(userAgent: string): boolean {
    return userAgent.includes("Playwright");
  }
}
