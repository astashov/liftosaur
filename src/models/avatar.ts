export const Avatar_paletteSize = 8;

export function Avatar_initials(nickname: string | undefined, fallback: string): string {
  const source = (nickname || "").trim();
  if (source.length === 0) {
    return fallback.slice(0, 2).toUpperCase();
  }
  const words = source.split(/[\s._-]+/).filter((w) => w.length > 0);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function Avatar_colorIndex(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1000003;
  }
  return hash % Avatar_paletteSize;
}
