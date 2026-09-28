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

export function FeatureImages_inlineHtml(markdown: string, sizes: IFeatureImageSizes): string {
  return markdown.replace(imageLine, (_match, alt: string, src: string, featureId: string, name: string) => {
    const size = FeatureImages_size(sizes, featureId, name);
    const dimensions = size ? ` width="${size.width}" height="${size.height}"` : "";
    return `<img src="${src}" alt="${escapeAttribute(alt)}"${dimensions} loading="lazy" decoding="async">`;
  });
}
