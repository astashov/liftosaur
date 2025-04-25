export class ImagePreloader {
  public static dynocoach: string = "/images/dinocoach.svg";
  public static dynoflex: string = "/images/dinoflex.svg";
  public static dynohappy: string = "/images/dinohappy.svg";

  private static images: Record<string, HTMLImageElement> = {};

  public static preload(url: string): Promise<HTMLImageElement> {
    if (this.images[url]) {
      return Promise.resolve(this.images[url]);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        this.images[url] = img;
        resolve(img);
      };
    });
  }
}
