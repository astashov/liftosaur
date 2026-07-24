import { Utils_getEnv } from "../utils";
import { IDI } from "../utils/di";
import { LftS3Buckets } from "./buckets";
import { IExpoAsset, IExpoPlatform } from "../updates/expoUpdatesProtocol";

export interface IUpdatePointer {
  updateId: string;
  createdAt: string;
}

export interface IUpdateMetadata {
  id: string;
  createdAt: string;
  runtimeVersion: string;
  launchAsset: IExpoAsset;
  assets: IExpoAsset[];
  metadata: Record<string, unknown>;
  extra: Record<string, unknown>;
}

export function UpdatesDao_bucketName(): string {
  const suffix = Utils_getEnv() === "dev" ? "dev" : "";
  return `${LftS3Buckets.static}${suffix}`;
}

export function UpdatesDao_pointerKey(args: {
  runtimeVersion: string;
  platform: IExpoPlatform;
  channel: string;
}): string {
  return `updates-pointers/${args.runtimeVersion}/${args.platform}/${args.channel}.json`;
}

export function UpdatesDao_metadataKey(args: {
  runtimeVersion: string;
  platform: IExpoPlatform;
  updateId: string;
}): string {
  return `updates/${args.runtimeVersion}/${args.platform}/${args.updateId}/metadata.json`;
}

export class UpdatesDao {
  constructor(private readonly di: IDI) {}

  public async getPointer(args: {
    runtimeVersion: string;
    platform: IExpoPlatform;
    channel: string;
  }): Promise<IUpdatePointer | undefined> {
    const buffer = await this.di.s3.getObject({
      bucket: UpdatesDao_bucketName(),
      key: UpdatesDao_pointerKey(args),
    });
    if (!buffer) {
      return undefined;
    }
    return JSON.parse(buffer.toString("utf8")) as IUpdatePointer;
  }

  public async getMetadata(args: {
    runtimeVersion: string;
    platform: IExpoPlatform;
    updateId: string;
  }): Promise<IUpdateMetadata | undefined> {
    const buffer = await this.di.s3.getObject({
      bucket: UpdatesDao_bucketName(),
      key: UpdatesDao_metadataKey(args),
    });
    if (!buffer) {
      return undefined;
    }
    return JSON.parse(buffer.toString("utf8")) as IUpdateMetadata;
  }
}
