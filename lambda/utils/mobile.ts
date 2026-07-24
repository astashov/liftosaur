export function Mobile_isMobileFromWindow(): boolean {
  return typeof window !== "undefined" && window.navigator ? Mobile_isMobile(window.navigator.userAgent) : false;
}

export function Mobile_isMobile(userAgent: string): boolean {
  return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

export function Mobile_isPlaywrightFromWindow(): boolean {
  return typeof window !== "undefined" && window.navigator ? Mobile_isPlaywright(window.navigator.userAgent) : false;
}

export function Mobile_isPlaywright(userAgent: string): boolean {
  return userAgent.includes("Playwright");
}
