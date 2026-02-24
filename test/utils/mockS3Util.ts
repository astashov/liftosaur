import { Readable } from "stream";
import { ILogUtil } from "../../lambda/utils/log";
import { IS3Util } from "../../lambda/utils/s3";

export class MockS3Util implements IS3Util {
  constructor(public readonly log: ILogUtil) {}

  public async listObjects(args: { bucket: string; prefix: string }): Promise<string[]> {
    return [];
  }
  public async getObject(args: { bucket: string; key: string }): Promise<Buffer | undefined> {
    return undefined;
  }
  public async putObject(args: {
    bucket: string;
    key: string;
    body: string | Buffer | Uint8Array | Readable;
    opts?: {
      acl?: string;
      contentType?: string;
    };
  }): Promise<void> {}

  public async deleteObject(args: { bucket: string; key: string }): Promise<void> {
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
