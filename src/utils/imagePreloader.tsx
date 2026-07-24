export function ImagePreloader_preload(url: string): Promise<HTMLImageElement> {
  if (ImagePreloader_images[url]) {
    return Promise.resolve(ImagePreloader_images[url]);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      ImagePreloader_images[url] = img;
      resolve(img);
    };
  });
}

export function ImagePreloader_uri(path: string): string {
  return path;
}

export function ImagePreloader_clear(): void {}

export const ImagePreloader_dynocoach: string = "/images/dinocoach.svg";

export const ImagePreloader_dynoflex: string = "/images/dinoflex.svg";

export const ImagePreloader_dynohappy: string = "/images/dinohappy.svg";

export const ImagePreloader_images: Record<string, HTMLImageElement> = {};
