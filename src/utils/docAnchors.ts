export function DocAnchors_slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
}

export function DocAnchors_unique(slug: string, used: Set<string>): string {
  let result = slug;
  for (let i = 2; used.has(result); i += 1) {
    result = `${slug}-${i}`;
  }
  used.add(result);
  return result;
}
