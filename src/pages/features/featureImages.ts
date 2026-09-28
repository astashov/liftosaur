export interface IFeatureImageSize {
  width: number;
  height: number;
}

export type IFeatureImageSizes = Record<string, IFeatureImageSize>;

const imageLine = /!\[([^\]]*)\]\((\/images\/features\/([^/)]+)\/([^/)]+)\.webp)\)/g;

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function FeatureImages_key(featureId: string, name: string): string {
  return `${featureId}/${name}`;
}

export function FeatureImages_size(
  sizes: IFeatureImageSizes,
  featureId: string,
  name: string
): IFeatureImageSize | undefined {
  return sizes[FeatureImages_key(featureId, name)];
}

export function FeatureImages_altText(title: string, featureId: string, name: string): string {
  const rest = name.replace(new RegExp(`^${featureId}-?`), "").replace(/-/g, " ");
  return rest ? `${title}: ${rest}` : title;
}

function imageTags(markdown: string, sizes: IFeatureImageSizes): string {
  return markdown.replace(imageLine, (_match, alt: string, src: string, featureId: string, name: string) => {
    const size = FeatureImages_size(sizes, featureId, name);
    const dimensions = size ? ` width="${size.width}" height="${size.height}"` : "";
    return `<img src="${src}" alt="${escapeAttribute(alt)}"${dimensions} loading="lazy" decoding="async">`;
  });
}

// A line holding one bare <img> tag is an HTML block to markdown-it, so it gets no <p> and
// the centering rule on `.feature-body p:has(> img)` never applies; wrap the line ourselves.
const imagesOnlyLine = /^(!\[[^\]]*\]\(\/images\/features\/[^)]+\)(?: !\[[^\]]*\]\(\/images\/features\/[^)]+\))*)$/gm;

export function FeatureImages_inlineHtml(markdown: string, sizes: IFeatureImageSizes): string {
  return imageTags(
    markdown.replace(imagesOnlyLine, (line) => `<p>${line}</p>`),
    sizes
  );
}
