import { S3 } from "aws-sdk";
import { ILogUtil } from "./log";

export interface IS3Util {
  listObjects(args: { bucket: string; prefix: string }): Promise<string[] | undefined>;
  getObject(args: { bucket: string; key: string }): Promise<AWS.S3.GetObjectOutput["Body"] | undefined>;
  putObject(args: {
    bucket: string;
    key: string;
    body: AWS.S3.PutObjectRequest["Body"];
    opts?: {
      acl?: AWS.S3.ObjectCannedACL;
      contentType?: AWS.S3.ContentType;
    };
  }): Promise<void>;
}

export class S3Util implements IS3Util {
  private _s3?: S3;

  constructor(public readonly log: ILogUtil) {}

  private get s3(): S3 {
    if (this._s3 == null) {
      this._s3 = new S3();
    }
    return this._s3;
  }

  public async listObjects(args: { bucket: string; prefix: string }): Promise<string[] | undefined> {
    const startTime = Date.now();
    let result: string[] = [];
    let nextPageAvailable = true;
    let nextMarker: AWS.S3.Marker | undefined = undefined;
    while (nextPageAvailable) {
      const response: AWS.S3.ListObjectsOutput = await this.s3
        .listObjects({ Bucket: args.bucket, Prefix: args.prefix, Marker: nextMarker })
        .promise();
      result = result.concat(response.Contents?.map((c) => c.Key!) ?? []);
      nextMarker = response.NextMarker;
      nextPageAvailable = !!response.NextMarker ?? false;
    }
    this.log.log(
      "S3 list objects:",
      `${args.bucket}/${args.prefix} - ${result.length}`,
      ` - ${Date.now() - startTime}ms`
    );
    return result;
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

  public async putObject(args: {
    bucket: string;
    key: string;
    body: AWS.S3.PutObjectRequest["Body"];
    opts?: {
      acl?: AWS.S3.ObjectCannedACL;
      contentType?: AWS.S3.ContentType;
    };
  }): Promise<void> {
    const startTime = Date.now();
    await this.s3
      .putObject({
        Bucket: args.bucket,
        Key: args.key,
        Body: args.body,
        ACL: args.opts?.acl,
        ContentType: args.opts?.contentType,
      })
      .promise();
    this.log.log("S3 put:", `${args.bucket}/${args.key}`, `- ${Date.now() - startTime}ms`);
  }
}
