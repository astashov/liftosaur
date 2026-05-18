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

  it("produces launchAsset with the bundle hash and given URL", () => {
    const bundlePath = path.join(tmp, "main.jsbundle");
    fs.writeFileSync(bundlePath, "bundle-content");

    const metadata = BuildMetadata_build({
      platform: "ios",
      runtimeVersion: "rv1",
      updateId: "u1",
      createdAt: "2026-05-13T00:00:00.000Z",
      bundlePath,
      bundleUrl: "https://www.liftosaur.com/static/updates/rv1/ios/u1/main.jsbundle",
    });

    expect(metadata.id).to.equal("u1");
    expect(metadata.runtimeVersion).to.equal("rv1");
    expect(metadata.launchAsset.url).to.equal("https://www.liftosaur.com/static/updates/rv1/ios/u1/main.jsbundle");
    expect(metadata.launchAsset.contentType).to.equal("application/javascript");
    expect(metadata.launchAsset.fileExtension).to.equal(".bundle");
    expect(metadata.launchAsset.hash).to.match(/^[A-Za-z0-9_-]+$/);
    expect(metadata.launchAsset.key).to.equal("main");
    expect(metadata.assets).to.have.lengthOf(0);
  });

  it("uses different content hashes for different bundle contents", () => {
    const bundlePath = path.join(tmp, "main.jsbundle");
    fs.writeFileSync(bundlePath, "bundle-content-A");
    const a = BuildMetadata_build({
      platform: "ios",
      runtimeVersion: "rv1",
      updateId: "u1",
      createdAt: "t",
      bundlePath,
      bundleUrl: "https://example.com/main.jsbundle",
    });
    fs.writeFileSync(bundlePath, "bundle-content-B");
    const b = BuildMetadata_build({
      platform: "ios",
      runtimeVersion: "rv1",
      updateId: "u1",
      createdAt: "t",
      bundlePath,
      bundleUrl: "https://example.com/main.jsbundle",
    });
    expect(a.launchAsset.hash).to.not.equal(b.launchAsset.hash);
  });
});
