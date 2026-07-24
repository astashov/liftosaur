import {
  S3Client,
  ListObjectsCommand,
  ListObjectsCommandOutput,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ObjectCannedACL,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import { ILogUtil } from "./log";

export interface IS3Util {
  listObjects(args: { bucket: string; prefix: string }): Promise<string[]>;
  getObject(args: { bucket: string; key: string }): Promise<Buffer | undefined>;
  putObject(args: {
    bucket: string;
    key: string;
    body: string | Buffer | Uint8Array | Readable;
    opts?: {
      acl?: string;
      contentType?: string;
    };
  }): Promise<void>;
  deleteObject(args: { bucket: string; key: string }): Promise<void>;
  getPresignedUploadUrl(args: {
    bucket: string;
    key: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<string>;
  getPresignedDownloadUrl(args: { bucket: string; key: string; expiresIn?: number }): Promise<string>;
}

export class S3Util implements IS3Util {
  private _s3?: S3Client;

  constructor(public readonly log: ILogUtil) {}

  private get s3(): S3Client {
    if (this._s3 == null) {
      this._s3 = new S3Client({});
    }
    return this._s3;
  }

  public async listObjects(args: { bucket: string; prefix: string }): Promise<string[]> {
    const startTime = Date.now();
    let result: string[] = [];
    let nextPageAvailable = true;
    let nextMarker: string | undefined = undefined;
    while (nextPageAvailable) {
      const response: ListObjectsCommandOutput = await this.s3.send(
        new ListObjectsCommand({ Bucket: args.bucket, Prefix: args.prefix, Marker: nextMarker })
      );
      result = result.concat(response.Contents?.map((c) => c.Key!) ?? []);
      nextMarker = response.NextMarker;
      nextPageAvailable = !!(response.NextMarker ?? false);
    }
    this.log.log(
      "S3 list objects:",
      `${args.bucket}/${args.prefix} - ${result.length}`,
      ` - ${Date.now() - startTime}ms`
    );
    return result;
  }

  public async getObject(args: { bucket: string; key: string }): Promise<Buffer | undefined> {
    const startTime = Date.now();
    let result: Buffer | undefined;
    try {
      const response = await this.s3.send(new GetObjectCommand({ Bucket: args.bucket, Key: args.key }));
      if (response.Body) {
        result = Buffer.from(await response.Body.transformToByteArray());
      }
    } catch (error) {
      const e = error as Error & { name?: string };
      result = undefined;
      if (e.name !== "NoSuchKey") {
        throw e;
      }
    }
    this.log.log("S3 get:", `${args.bucket}/${args.key}`, ` - ${Date.now() - startTime}ms`);
    return result;
  }

  public async putObject(args: {
    bucket: string;
    key: string;
    body: string | Buffer | Uint8Array | Readable;
    opts?: {
      acl?: ObjectCannedACL;
      contentType?: string;
    };
  }): Promise<void> {
    const startTime = Date.now();
    await this.s3.send(
      new PutObjectCommand({
        Bucket: args.bucket,
        Key: args.key,
        Body: args.body,
        ACL: args.opts?.acl,
        ContentType: args.opts?.contentType,
      })
    );
    this.log.log("S3 put:", `${args.bucket}/${args.key}`, `- ${Date.now() - startTime}ms`);
  }

  public async deleteObject(args: { bucket: string; key: string }): Promise<void> {
    const startTime = Date.now();
    await this.s3.send(new DeleteObjectCommand({ Bucket: args.bucket, Key: args.key }));
    this.log.log("S3 delete:", `${args.bucket}/${args.key}`, `- ${Date.now() - startTime}ms`);
  }

  public async getPresignedUploadUrl(args: {
    bucket: string;
    key: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<string> {
    const startTime = Date.now();
    const command = new PutObjectCommand({
      Bucket: args.bucket,
      Key: args.key,
      ContentType: args.contentType,
    });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: args.expiresIn || 300 });
    this.log.log(
      "S3 presigned URL generated:",
      `${args.bucket}/${args.key}`,
      args.contentType,
      `- ${Date.now() - startTime}ms`
    );
    return uploadUrl;
  }

  public async getPresignedDownloadUrl(args: { bucket: string; key: string; expiresIn?: number }): Promise<string> {
    const startTime = Date.now();
    const command = new GetObjectCommand({
      Bucket: args.bucket,
      Key: args.key,
    });
    const downloadUrl = await getSignedUrl(this.s3, command, { expiresIn: args.expiresIn || 300 });
    this.log.log("S3 presigned download URL generated:", `${args.bucket}/${args.key}`, `- ${Date.now() - startTime}ms`);
    return downloadUrl;
  }
}
