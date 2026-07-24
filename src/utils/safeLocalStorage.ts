// Accessing `window.localStorage` throws `SecurityError: The operation is insecure.` on iOS Safari
// when storage is blocked (e.g. "Block All Cookies" or some private/embedded contexts). The throw
// happens on the property access itself, so optional chaining (`window.localStorage?.`) can't guard it.
export function SafeLocalStorage_getItem(key: string): string | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function SafeLocalStorage_setItem(key: string, value: string): void {
  try {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(key, value);
  } catch {
    // ignore - storage may be blocked or full
  }
}

export function SafeLocalStorage_removeItem(key: string): void {
  try {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.removeItem(key);
  } catch {
    // ignore - storage may be blocked
  }
}
