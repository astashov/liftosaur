import { Readable } from "stream";
import { ILogUtil } from "../../lambda/utils/log";
import { IS3Util } from "../../lambda/utils/s3";

export class MockS3Util implements IS3Util {
  private readonly objects: Record<string, Buffer> = {};

  constructor(public readonly log: ILogUtil) {}

  public async listObjects(args: { bucket: string; prefix: string }): Promise<string[]> {
    return Object.keys(this.objects)
      .filter((k) => k.startsWith(`${args.bucket}/${args.prefix}`))
      .map((k) => k.replace(`${args.bucket}/`, ""));
  }
  public async getObject(args: { bucket: string; key: string }): Promise<Buffer | undefined> {
    return this.objects[`${args.bucket}/${args.key}`];
  }
  public async putObject(args: {
    bucket: string;
    key: string;
    body: string | Buffer | Uint8Array | Readable;
    opts?: {
      acl?: string;
      contentType?: string;
    };
  }): Promise<void> {
    if (typeof args.body === "string" || Buffer.isBuffer(args.body) || args.body instanceof Uint8Array) {
      this.objects[`${args.bucket}/${args.key}`] = Buffer.from(args.body as string | Buffer | Uint8Array);
    }
  }

  public async deleteObject(args: { bucket: string; key: string }): Promise<void> {
    delete this.objects[`${args.bucket}/${args.key}`];
    return undefined;
  }

  public getPresignedUploadUrl(args: {
    bucket: string;
    key: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<string> {
    return Promise.resolve("https://example.com/presigned-upload-url");
  }

  public getPresignedDownloadUrl(args: { bucket: string; key: string; expiresIn?: number }): Promise<string> {
    return Promise.resolve("https://example.com/presigned-download-url");
  }
}
