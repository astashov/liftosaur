import { DynamoUtil } from "./dynamo";
import { LogUtil } from "./log";
import { SecretsUtil } from "./secrets";
import { S3Util } from "./s3";
import { SesUtil } from "./ses";
import { LambdaUtil } from "./lambda";
import { CloudwatchUtil } from "./cloudwatch";

export interface IDI {
  dynamo: DynamoUtil;
  log: LogUtil;
  s3: S3Util;
  ses: SesUtil;
  secrets: SecretsUtil;
  lambda: LambdaUtil;
  cloudwatch: CloudwatchUtil;
}

export function buildDi(log: LogUtil, fetch?: Window["fetch"]): IDI {
  return {
    dynamo: new DynamoUtil(log),
    secrets: new SecretsUtil(log),
    s3: new S3Util(log),
    ses: new SesUtil(log),
    lambda: new LambdaUtil(log),
    cloudwatch: new CloudwatchUtil(log),
    log: log,
  };
}
