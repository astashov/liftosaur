import { ILogUtil } from "../../lambda/utils/log";
import Rollbar from "rollbar";

export class MockLogUtil implements ILogUtil {
  public logs: string[] = [];
  public userid?: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public log(...str: any[]): void {
    this.logs.push(str.join(" "));
  }

  public setUser(userid: string): void {
    this.userid = userid;
  }

  setRollbar(rollbar: Rollbar): void {}
}
