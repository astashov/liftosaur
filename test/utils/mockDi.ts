import { IDI } from "../../lambda/utils/di";
import { ILogUtil } from "../../lambda/utils/log";
import { MockCloudwatchUtil } from "./mockCloudwatchUtil";
import { MockDynamoUtil } from "./mockDynamoUtil";
import { MockLambdaUtil } from "./mockLambdaUtil";
import { MockS3Util } from "./mockS3Util";
import { MockSecretsUtil } from "./mockSecretsUtil";
import { MockSesUtil } from "./mockSesUtil";
import { MockSnsUtil } from "./mockSnsUtil";

export interface IMockDI extends IDI {
  dynamo: MockDynamoUtil;
  log: ILogUtil;
  s3: MockS3Util;
  ses: MockSesUtil;
  secrets: MockSecretsUtil;
  lambda: MockLambdaUtil;
  cloudwatch: MockCloudwatchUtil;
  sns: MockSnsUtil;
  fetch: Window["fetch"];
}

export function buildMockDi(log: ILogUtil, fetch: Window["fetch"]): IMockDI {
  return {
    dynamo: new MockDynamoUtil(log),
    secrets: new MockSecretsUtil(log),
    s3: new MockS3Util(log),
    ses: new MockSesUtil(log),
    lambda: new MockLambdaUtil(log),
    cloudwatch: new MockCloudwatchUtil(log),
    sns: new MockSnsUtil(log),
    log,
    fetch,
  };
}
