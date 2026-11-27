export type IDocImageSection = "features" | "compare";

export interface IDocImageSize {
  width: number;
  height: number;
}

export type IDocImageSizes = Record<string, IDocImageSize>;

function imageLine(section: IDocImageSection): RegExp {
  return new RegExp(`!\\[([^\\]]*)\\]\\((\\/images\\/${section}\\/([^/)]+)\\/([^/)]+)\\.webp)\\)`, "g");
}

function imagesOnlyLine(section: IDocImageSection): RegExp {
  const image = `!\\[[^\\]]*\\]\\(\\/images\\/${section}\\/[^)]+\\)`;
  return new RegExp(`^(${image}(?: ${image})*)$`, "gm");
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function DocImages_url(section: IDocImageSection, articleId: string, name: string): string {
  return `/images/${section}/${articleId}/${name}.webp`;
}

export function DocImages_key(articleId: string, name: string): string {
  return `${articleId}/${name}`;
}

export function DocImages_size(sizes: IDocImageSizes, articleId: string, name: string): IDocImageSize | undefined {
  return sizes[DocImages_key(articleId, name)];
}

function imageTags(section: IDocImageSection, markdown: string, sizes: IDocImageSizes): string {
  return markdown.replace(imageLine(section), (_match, alt: string, src: string, articleId: string, name: string) => {
    const size = DocImages_size(sizes, articleId, name);
    const dimensions = size ? ` width="${size.width}" height="${size.height}"` : "";
    return `<img src="${src}" alt="${escapeAttribute(alt)}"${dimensions} loading="lazy" decoding="async">`;
  });
}

// A line holding one bare <img> tag is an HTML block to markdown-it, so it gets no <p> and
// the centering rule on `p:has(> img)` never applies. So we wrap the line in <p>.
export function DocImages_inlineHtml(section: IDocImageSection, markdown: string, sizes: IDocImageSizes): string {
  return imageTags(
    section,
    markdown.replace(imagesOnlyLine(section), (line) => `<p>${line}</p>`),
    sizes
  );
}

export function DocImages_sizesFor(section: IDocImageSection, markdown: string, sizes: IDocImageSizes): IDocImageSizes {
  const result: IDocImageSizes = {};
  for (const match of markdown.matchAll(imageLine(section))) {
    const key = DocImages_key(match[3], match[4]);
    if (sizes[key] != null) {
      result[key] = sizes[key];
    }
  }
  return result;
}
