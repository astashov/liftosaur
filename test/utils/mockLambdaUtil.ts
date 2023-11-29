import { ILambdaUtil } from "../../lambda/utils/lambda";
import { ILogUtil } from "../../lambda/utils/log";

export class MockLambdaUtil implements ILambdaUtil {
  constructor(public readonly log: ILogUtil) {}
  public async invoke<T>(args: {
    name: string;
    invocationType: "RequestResponse" | "Event";
    payload: T;
  }): Promise<void> {}
}
