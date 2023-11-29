import { DynamoUtil, IDynamoUtil } from "./dynamo";
import { ILogUtil } from "./log";
import { ISecretsUtil, SecretsUtil } from "./secrets";
import { IS3Util, S3Util } from "./s3";
import { ISesUtil, SesUtil } from "./ses";
import { ILambdaUtil, LambdaUtil } from "./lambda";
import { CloudwatchUtil, ICloudwatchUtil } from "./cloudwatch";

export interface IDI {
  dynamo: IDynamoUtil;
  log: ILogUtil;
  s3: IS3Util;
  ses: ISesUtil;
  secrets: ISecretsUtil;
  lambda: ILambdaUtil;
  cloudwatch: ICloudwatchUtil;
  fetch: Window["fetch"];
}

export function buildDi(log: ILogUtil, fetch: Window["fetch"]): IDI {
  return {
    dynamo: new DynamoUtil(log),
    secrets: new SecretsUtil(log),
    s3: new S3Util(log),
    ses: new SesUtil(log),
    lambda: new LambdaUtil(log),
    cloudwatch: new CloudwatchUtil(log),
    log: log,
    fetch,
  };
}
