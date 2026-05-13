import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { BuildMetadata_build } from "../../scripts/buildRnBundle/buildMetadata";

describe("buildMetadata", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "build-rn-metadata-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function seed(platformBundle: Record<string, string>) {
    fs.mkdirSync(path.join(tmp, "_expo/static/js/ios"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "_expo/static/js/android"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "assets"), { recursive: true });
    for (const [relPath, content] of Object.entries(platformBundle)) {
      const abs = path.join(tmp, relPath);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content);
    }
  }

  it("produces launchAsset + assets with correct URLs and content-types", () => {
    seed({
      "_expo/static/js/ios/index-abc.hbc": "bundle-content",
      "assets/imgHash1": "fake-png",
      "metadata.json": JSON.stringify({
        version: 0,
        bundler: "metro",
        fileMetadata: {
          ios: {
            bundle: "_expo/static/js/ios/index-abc.hbc",
            assets: [{ path: "assets/imgHash1", ext: "png" }],
          },
        },
      }),
    });

    const metadata = BuildMetadata_build({
      platform: "ios",
      runtimeVersion: "rv1",
      updateId: "u1",
      createdAt: "2026-05-13T00:00:00.000Z",
      inputDir: tmp,
      urlPrefix: "https://www.liftosaur.com/static/updates/rv1/ios/u1",
    });

    expect(metadata.id).to.equal("u1");
    expect(metadata.runtimeVersion).to.equal("rv1");
    expect(metadata.launchAsset.url).to.equal(
      "https://www.liftosaur.com/static/updates/rv1/ios/u1/_expo/static/js/ios/index-abc.hbc"
    );
    expect(metadata.launchAsset.contentType).to.equal("application/javascript");
    expect(metadata.launchAsset.fileExtension).to.equal(".bundle");
    expect(metadata.launchAsset.hash).to.match(/^[A-Za-z0-9_-]+$/);
    expect(metadata.assets).to.have.lengthOf(1);
    expect(metadata.assets[0].url).to.equal("https://www.liftosaur.com/static/updates/rv1/ios/u1/assets/imgHash1");
    expect(metadata.assets[0].contentType).to.equal("image/png");
    expect(metadata.assets[0].fileExtension).to.equal(".png");
  });

  it("throws when the platform is missing from expo metadata", () => {
    seed({
      "metadata.json": JSON.stringify({ version: 0, bundler: "metro", fileMetadata: { ios: { bundle: "x", assets: [] } } }),
    });
    expect(() =>
      BuildMetadata_build({
        platform: "android",
        runtimeVersion: "rv1",
        updateId: "u1",
        createdAt: "2026-05-13T00:00:00.000Z",
        inputDir: tmp,
        urlPrefix: "https://example.com",
      })
    ).to.throw(/android/);
  });

  it("uses different content hashes for different bundle contents", () => {
    seed({
      "_expo/static/js/ios/index-1.hbc": "bundle-content-A",
      "metadata.json": JSON.stringify({
        version: 0,
        bundler: "metro",
        fileMetadata: { ios: { bundle: "_expo/static/js/ios/index-1.hbc", assets: [] } },
      }),
    });
    const a = BuildMetadata_build({
      platform: "ios",
      runtimeVersion: "rv1",
      updateId: "u1",
      createdAt: "t",
      inputDir: tmp,
      urlPrefix: "https://example.com",
    });
    fs.writeFileSync(path.join(tmp, "_expo/static/js/ios/index-1.hbc"), "bundle-content-B");
    const b = BuildMetadata_build({
      platform: "ios",
      runtimeVersion: "rv1",
      updateId: "u1",
      createdAt: "t",
      inputDir: tmp,
      urlPrefix: "https://example.com",
    });
    expect(a.launchAsset.hash).to.not.equal(b.launchAsset.hash);
  });
});
