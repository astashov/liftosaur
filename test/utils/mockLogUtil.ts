import { ILogUtil } from "../../lambda/utils/log";

export class MockLogUtil implements ILogUtil {
  public readonly logs: string[] = [];
  public userid?: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public log(...str: any[]): void {
    this.logs.push(str.join(" "));
  }

  public setUser(userid: string): void {
    this.userid = userid;
  }
}
