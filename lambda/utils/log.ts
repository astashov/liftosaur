/* eslint-disable @typescript-eslint/no-explicit-any */
import { UidFactory_generateUid } from "./generator";
import { Utils_getEnv } from "../utils";

export interface ILogUtil {
  id: string;
  log(...str: any[]): void;
  setUser(userid: string): void;
}

export class LogUtil implements ILogUtil {
  public id: string;
  private userid: string | undefined;

  constructor() {
    this.id = UidFactory_generateUid(4);
  }

  public setUser(userid: string): void {
    this.userid = userid;
  }

  public log(...str: any[]): void {
    const env = Utils_getEnv();
    const time = new Date();
    const timeStr =
      env === "dev"
        ? `${this.prefixTime(time.getHours())}:${this.prefixTime(time.getMinutes())}:${this.prefixTime(
            time.getSeconds()
          )}.${time.getMilliseconds().toString().padStart(3, "0")}`
        : "";

    if (env === "dev") {
      console.log(
        this.colorize(timeStr, 36),
        `[${this.colorize(this.id, 33)}]${this.userid ? `[${this.colorize(this.userid, 32)}]` : ""}`,
        ...str
      );
    } else {
      console.log(`[${this.colorize(this.id, 33)}]${this.userid ? `[${this.colorize(this.userid, 32)}]` : ""}`, ...str);
    }
  }

  private prefixTime(time: number): string {
    return `${time}`.padStart(2, "0");
  }

  private colorize(str: string, color: number): string {
    const env = Utils_getEnv();

    if (env === "dev") {
      return "\x1b[" + color.toString() + "m" + str + "\x1b[0m";
    } else {
      return str;
    }
  }
}
