// Browsers apply their own font-size preference to the root rem, but Rem_set overwrites
// documentElement.style.fontSize outright, so there is nothing left to read here.
export function useOsFontScale(): number {
  return 1;
}

export function OsFontScale_get(): number {
  return 1;
}
