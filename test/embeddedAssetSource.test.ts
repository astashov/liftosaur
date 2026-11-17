import "mocha";
import { expect } from "chai";
import { EmbeddedAssetSource_resolve, IAssetSourceResolver } from "../src/utils/embeddedAssetSource";

function fakeResolver(isFile: boolean): IAssetSourceResolver<string> {
  return {
    isLoadedFromFileSystem: () => isFile,
    resourceIdentifierWithoutScale: () => "assets_bundledimages_reactions_dino_flex",
    scaledAssetPath: () => "assets/assets/bundledImages/reactions/dino_flex.png",
  };
}

describe("EmbeddedAssetSource_resolve", () => {
  it("leaves the default lookup alone when the bundle is embedded or served by Metro", () => {
    expect(EmbeddedAssetSource_resolve(fakeResolver(false), "ios")).to.equal(null);
    expect(EmbeddedAssetSource_resolve(fakeResolver(false), "android")).to.equal(null);
  });

  it("reads an OTA bundle's images from the iOS app bundle by relative path", () => {
    expect(EmbeddedAssetSource_resolve(fakeResolver(true), "ios")).to.equal(
      "assets/assets/bundledImages/reactions/dino_flex.png"
    );
  });

  it("reads an OTA bundle's images from the APK drawables by resource name", () => {
    expect(EmbeddedAssetSource_resolve(fakeResolver(true), "android")).to.equal(
      "assets_bundledimages_reactions_dino_flex"
    );
  });
});
