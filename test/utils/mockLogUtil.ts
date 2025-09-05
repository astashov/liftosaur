import { ILogUtil } from "../../lambda/utils/log";
import Rollbar from "rollbar";
import { UidFactory } from "../../src/utils/generator";

export class MockLogUtil implements ILogUtil {
  public logs: string[] = [];
  public userid?: string;
  public id: string;

  constructor() {
    this.id = UidFactory.generateUid(4);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public log(...str: any[]): void {
    this.logs.push(str.join(" "));
  }

  public setUser(userid: string): void {
    this.userid = userid;
  }

  public setRollbar(rollbar: Rollbar): void {}
}
