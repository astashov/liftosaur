import * as crypto from "crypto";

export type IExpoPlatform = "ios" | "android";

export interface IExpoManifestRequestHeaders {
  protocolVersion: number;
  platform: IExpoPlatform;
  runtimeVersion: string;
  channelName: string;
  expectSignature: boolean;
}

export interface IExpoAsset {
  hash: string;
  key: string;
  contentType: string;
  fileExtension: string;
  url: string;
}

export interface IExpoManifest {
  id: string;
  createdAt: string;
  runtimeVersion: string;
  launchAsset: IExpoAsset;
  assets: IExpoAsset[];
  metadata: Record<string, unknown>;
  extra: Record<string, unknown>;
}

export interface IExpoDirective {
  type: "noUpdateAvailable" | "rollBackToEmbedded";
  parameters?: Record<string, unknown>;
}

export interface IExpoManifestPart {
  manifest: IExpoManifest;
  signature?: string;
}

export interface IExpoDirectivePart {
  directive: IExpoDirective;
  signature?: string;
}

export type IExpoMultipartPart =
  | { name: "manifest"; body: IExpoManifestPart }
  | { name: "directive"; body: IExpoDirectivePart };

export function ExpoUpdatesProtocol_parseRequestHeaders(
  headers: Record<string, string | undefined>
): IExpoManifestRequestHeaders | { error: string } {
  const lower: Record<string, string | undefined> = {};
  for (const k of Object.keys(headers)) {
    lower[k.toLowerCase()] = headers[k];
  }
  const protocolHeader = lower["expo-protocol-version"];
  const platform = lower["expo-platform"];
  const runtimeVersion = lower["expo-runtime-version"];
  const channelName = lower["expo-channel-name"];
  const expectSignature = lower["expo-expect-signature"];

  if (!protocolHeader) {
    return { error: "missing expo-protocol-version" };
  }
  if (platform !== "ios" && platform !== "android") {
    return { error: "invalid expo-platform" };
  }
  if (!runtimeVersion) {
    return { error: "missing expo-runtime-version" };
  }
  if (!channelName) {
    return { error: "missing expo-channel-name" };
  }

  const protocolVersion = parseInt(protocolHeader, 10);
  if (!Number.isFinite(protocolVersion) || protocolVersion < 0) {
    return { error: "invalid expo-protocol-version" };
  }

  return {
    protocolVersion,
    platform,
    runtimeVersion,
    channelName,
    expectSignature: !!expectSignature,
  };
}

export function ExpoUpdatesProtocol_serializeMultipart(parts: IExpoMultipartPart[]): {
  body: string;
  contentType: string;
} {
  const boundary = `lftupd${crypto.randomBytes(8).toString("hex")}`;
  const chunks: string[] = [];
  for (const part of parts) {
    let payload: string;
    let signature: string | undefined;
    if (part.name === "manifest") {
      payload = JSON.stringify(part.body.manifest);
      signature = part.body.signature;
    } else {
      payload = JSON.stringify(part.body.directive);
      signature = part.body.signature;
    }
    chunks.push(`--${boundary}\r\n`);
    chunks.push(`Content-Type: application/json; charset=utf-8\r\n`);
    chunks.push(`Content-Disposition: form-data; name="${part.name}"\r\n`);
    if (signature) {
      chunks.push(`expo-signature: ${signature}\r\n`);
    }
    chunks.push(`\r\n`);
    chunks.push(payload);
    chunks.push(`\r\n`);
  }
  chunks.push(`--${boundary}--\r\n`);
  return {
    body: chunks.join(""),
    contentType: `multipart/mixed; boundary=${boundary}`,
  };
}

export function ExpoUpdatesProtocol_sha256Base64Url(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("base64url");
}
