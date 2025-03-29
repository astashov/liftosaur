export namespace Mobile {
  export function isMobile(userAgent: string): boolean {
    return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  }

  export function isPlaywright(userAgent: string): boolean {
    return userAgent.includes("Playwright");
  }
}
