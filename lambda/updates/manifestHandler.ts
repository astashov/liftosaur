import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { IDI } from "../utils/di";
import { UpdatesDao } from "../dao/updatesDao";
import {
  ExpoUpdatesProtocol_parseRequestHeaders,
  ExpoUpdatesProtocol_serializeMultipart,
  IExpoManifest,
  IExpoMultipartPart,
} from "./expoUpdatesProtocol";
import { ManifestSigner } from "./manifestSigner";

export async function Updates_handleManifest(event: APIGatewayProxyEvent, di: IDI): Promise<APIGatewayProxyResult> {
  const parsed = ExpoUpdatesProtocol_parseRequestHeaders(event.headers ?? {});
  if ("error" in parsed) {
    return { statusCode: 400, body: parsed.error };
  }
  const { platform, runtimeVersion, channelName } = parsed;
  const dao = new UpdatesDao(di);
  const signer = new ManifestSigner(di.secrets);

  const pointer = await dao.getPointer({ runtimeVersion, platform, channel: channelName });
  if (!pointer) {
    return buildDirectiveResponse(signer);
  }
  const metadata = await dao.getMetadata({
    runtimeVersion,
    platform,
    updateId: pointer.updateId,
  });
  if (!metadata) {
    di.log.log(`Manifest: pointer exists but metadata missing for ${runtimeVersion}/${platform}/${pointer.updateId}`);
    return buildDirectiveResponse(signer);
  }
  return buildManifestResponse(metadata, signer);
}

async function buildDirectiveResponse(signer: ManifestSigner): Promise<APIGatewayProxyResult> {
  const directive = { type: "noUpdateAvailable" as const };
  const signature = await signer.sign(JSON.stringify(directive));
  const parts: IExpoMultipartPart[] = [{ name: "directive", body: { directive, signature } }];
  const { body, contentType } = ExpoUpdatesProtocol_serializeMultipart(parts);
  return { statusCode: 200, body, headers: { "content-type": contentType } };
}

async function buildManifestResponse(metadata: IExpoManifest, signer: ManifestSigner): Promise<APIGatewayProxyResult> {
  const manifest: IExpoManifest = {
    id: metadata.id,
    createdAt: metadata.createdAt,
    runtimeVersion: metadata.runtimeVersion,
    launchAsset: metadata.launchAsset,
    assets: metadata.assets,
    metadata: metadata.metadata,
    extra: metadata.extra,
  };
  const signature = await signer.sign(JSON.stringify(manifest));
  const parts: IExpoMultipartPart[] = [{ name: "manifest", body: { manifest, signature } }];
  const { body, contentType } = ExpoUpdatesProtocol_serializeMultipart(parts);
  return { statusCode: 200, body, headers: { "content-type": contentType } };
}
