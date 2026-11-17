declare module "react-native/Libraries/Image/resolveAssetSource" {
  import { ImageResolvedAssetSource } from "react-native";
  import { IAssetSourceResolver } from "../utils/embeddedAssetSource";

  interface IResolveAssetSource {
    addCustomSourceTransformer(
      transformer: (resolver: IAssetSourceResolver<ImageResolvedAssetSource>) => ImageResolvedAssetSource | null
    ): void;
  }
  const resolveAssetSource: IResolveAssetSource;
  export default resolveAssetSource;
}
