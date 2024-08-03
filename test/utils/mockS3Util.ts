import { ILogUtil } from "../../lambda/utils/log";
import { IS3Util } from "../../lambda/utils/s3";

export class MockS3Util implements IS3Util {
  constructor(public readonly log: ILogUtil) {}

  public async listObjects(args: { bucket: string; prefix: string }): Promise<string[] | undefined> {
    return [];
  }
  public async getObject(args: { bucket: string; key: string }): Promise<AWS.S3.GetObjectOutput["Body"] | undefined> {
    return undefined;
  }
  public async putObject(args: {
    bucket: string;
    key: string;
    body: AWS.S3.PutObjectRequest["Body"];
    opts?: {
      acl?: AWS.S3.ObjectCannedACL;
      contentType?: AWS.S3.ContentType;
    };
  }): Promise<void> {}

  public async deleteObject(args: { bucket: string; key: string }): Promise<void> {
    return undefined;
  }
}
