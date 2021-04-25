import { DynamoUtil } from "./dynamo";
import { LogUtil } from "./log";
import { SecretsUtil } from "./secrets";
import { S3Util } from "./s3";

export interface IDI {
  dynamo: DynamoUtil;
  log: LogUtil;
  s3: S3Util;
  secrets: SecretsUtil;
}
