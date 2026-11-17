export interface IAssetSourceResolver<T> {
  isLoadedFromFileSystem(): boolean;
  resourceIdentifierWithoutScale(): T;
  scaledAssetPath(): T;
}

// An OTA bundle runs from a downloaded file, and RN looks for images next to it. We ship only the
// JS, so the images are read from the copy inside the app binary.
export function EmbeddedAssetSource_resolve<T>(
  resolver: IAssetSourceResolver<T>,
  os: "ios" | "android" | string
): T | null {
  if (!resolver.isLoadedFromFileSystem()) {
    return null;
  }
  return os === "android" ? resolver.resourceIdentifierWithoutScale() : resolver.scaledAssetPath();
}
