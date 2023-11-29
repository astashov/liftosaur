import { ICloudwatchUtil } from "../../lambda/utils/cloudwatch";
import { ILogUtil } from "../../lambda/utils/log";

export class MockCloudwatchUtil implements ICloudwatchUtil {
  constructor(public readonly log: ILogUtil) {}
  public async getLogs(date: Date): Promise<void> {}
}
