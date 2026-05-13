import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Updates_handleManifest } from "../../lambda/updates/manifestHandler";
import { buildMockDi, IMockDI } from "../utils/mockDi";
import { MockLogUtil } from "../utils/mockLogUtil";
import { UpdatesDao_bucketName, UpdatesDao_pointerKey, UpdatesDao_metadataKey } from "../../lambda/dao/updatesDao";

function buildEvent(headers: Record<string, string | undefined>): APIGatewayProxyEvent {
  return { headers } as unknown as APIGatewayProxyEvent;
}

function validHeaders(over: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    "expo-protocol-version": "1",
    "expo-platform": "ios",
    "expo-runtime-version": "abc123",
    "expo-channel-name": "production",
    ...over,
  };
}

describe("Updates manifest handler", () => {
  let di: IMockDI;

  beforeEach(() => {
    (global as { __ENV__?: string }).__ENV__ = "prod";
    di = buildMockDi(new MockLogUtil(), {} as Window["fetch"]);
  });

  afterEach(() => sinon.restore());

  it("returns 400 when required header is missing", async () => {
    const event = buildEvent({ "expo-protocol-version": "1", "expo-platform": "ios" });
    const resp = await Updates_handleManifest(event, di);
    expect(resp.statusCode).to.equal(400);
  });

  it("returns 400 when platform is invalid", async () => {
    const event = buildEvent(validHeaders({ "expo-platform": "windows" }));
    const resp = await Updates_handleManifest(event, di);
    expect(resp.statusCode).to.equal(400);
  });

  it("returns noUpdateAvailable directive when pointer is missing", async () => {
    sinon.stub(di.s3, "getObject").resolves(undefined);
    const resp = await Updates_handleManifest(buildEvent(validHeaders()), di);
    expect(resp.statusCode).to.equal(200);
    expect(resp.headers?.["content-type"]).to.match(/^multipart\/mixed; boundary=/);
    expect(resp.body).to.include('"type":"noUpdateAvailable"');
    expect(resp.body).to.include('name="directive"');
  });

  it("returns noUpdateAvailable directive when pointer exists but metadata missing", async () => {
    const pointerKey = UpdatesDao_pointerKey({
      runtimeVersion: "abc123",
      platform: "ios",
      channel: "production",
    });
    const metadataKey = UpdatesDao_metadataKey({
      runtimeVersion: "abc123",
      platform: "ios",
      updateId: "u1",
    });
    sinon.stub(di.s3, "getObject").callsFake(async (args: { key: string }) => {
      if (args.key === pointerKey) {
        return Buffer.from(JSON.stringify({ updateId: "u1", createdAt: "2026-05-01T00:00:00Z" }));
      }
      if (args.key === metadataKey) {
        return undefined;
      }
      return undefined;
    });
    const resp = await Updates_handleManifest(buildEvent(validHeaders()), di);
    expect(resp.statusCode).to.equal(200);
    expect(resp.body).to.include('"type":"noUpdateAvailable"');
  });

  it("returns signed manifest part when pointer + metadata are present", async () => {
    const pointerKey = UpdatesDao_pointerKey({
      runtimeVersion: "abc123",
      platform: "ios",
      channel: "production",
    });
    const metadataKey = UpdatesDao_metadataKey({
      runtimeVersion: "abc123",
      platform: "ios",
      updateId: "u1",
    });
    const metadata = {
      id: "u1",
      createdAt: "2026-05-01T00:00:00Z",
      runtimeVersion: "abc123",
      launchAsset: {
        hash: "h",
        key: "k",
        contentType: "application/javascript",
        fileExtension: "bundle",
        url: "https://www.liftosaur.com/static/updates/abc123/ios/u1/bundle.js",
      },
      assets: [],
      metadata: {},
      extra: {},
    };
    sinon.stub(di.s3, "getObject").callsFake(async (args: { key: string }) => {
      if (args.key === pointerKey) {
        return Buffer.from(JSON.stringify({ updateId: "u1", createdAt: "2026-05-01T00:00:00Z" }));
      }
      if (args.key === metadataKey) {
        return Buffer.from(JSON.stringify(metadata));
      }
      return undefined;
    });
    const resp = await Updates_handleManifest(buildEvent(validHeaders()), di);
    expect(resp.statusCode).to.equal(200);
    expect(resp.body).to.include('name="manifest"');
    expect(resp.body).to.include('"id":"u1"');
    expect(resp.body).to.include("launchAsset");
  });

  it("isolates per-platform pointer lookups", async () => {
    const stub = sinon.stub(di.s3, "getObject").resolves(undefined);
    await Updates_handleManifest(buildEvent(validHeaders({ "expo-platform": "android" })), di);
    expect(stub.firstCall.args[0].key).to.equal(
      UpdatesDao_pointerKey({ runtimeVersion: "abc123", platform: "android", channel: "production" })
    );
    expect(stub.firstCall.args[0].bucket).to.equal(UpdatesDao_bucketName());
  });
});
