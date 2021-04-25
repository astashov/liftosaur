import { S3 } from "aws-sdk";
import { LogUtil } from "./log";

export class S3Util {
  private _s3?: S3;

  constructor(public readonly log: LogUtil) {}

  private get s3(): S3 {
    if (this._s3 == null) {
      this._s3 = new S3();
    }
    return this._s3;
  }

  public async getObject(args: { bucket: string; key: string }): Promise<AWS.S3.GetObjectOutput["Body"] | undefined> {
    const startTime = Date.now();
    let result: AWS.S3.GetObjectOutput["Body"] | undefined;
    try {
      const response = await this.s3.getObject({ Bucket: args.bucket, Key: args.key }).promise();
      result = response.Body;
    } catch (e) {
      result = undefined;
      if (e.code !== "NoSuchKey") {
        throw e;
      }
    }
    this.log.log("S3 get:", `${args.bucket}/${args.key}`, ` - ${Date.now() - startTime}ms`);
    return result;
  }

  public async putObject(args: { bucket: string; key: string; body: AWS.S3.PutObjectRequest["Body"] }): Promise<void> {
    const startTime = Date.now();
    await this.s3.putObject({ Bucket: args.bucket, Key: args.key, Body: args.body }).promise();
    this.log.log("S3 put:", `${args.bucket}/${args.key}`, `- ${Date.now() - startTime}ms`);
  }
}
