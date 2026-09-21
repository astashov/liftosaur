export function NavOptionsChanged_isChanged<T extends object>(prev: T | undefined, next: T): boolean {
  if (prev == null) {
    return true;
  }
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  if (prevKeys.length !== nextKeys.length) {
    return true;
  }
  for (const key of nextKeys as Array<keyof T>) {
    if (prev[key] !== next[key]) {
      return true;
    }
  }
  return false;
}
