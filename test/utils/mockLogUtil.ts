import { ILogUtil } from "../../lambda/utils/log";

export class MockLogUtil implements ILogUtil {
  public readonly logs: string[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public log(...str: any[]): void {
    this.logs.push(str.join(" "));
  }
}
