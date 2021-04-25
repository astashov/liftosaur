import { UidFactory } from "./generator";

export class LogUtil {
  private readonly id: string;

  constructor() {
    this.id = UidFactory.generateUid(4);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public log(...str: any[]): void {
    const time = new Date();
    const timeStr = `${this.prefixTime(time.getHours())}:${this.prefixTime(time.getMinutes())}:${this.prefixTime(
      time.getSeconds()
    )}.${time.getMilliseconds().toString().padStart(3, "0")}`;
    console.log("[\x1b[36m" + timeStr + "\x1b[0m]", "[\x1b[33m" + this.id + "\x1b[0m]", ...str);
  }

  private prefixTime(time: number): string {
    return `${time}`.padStart(2, "0");
  }
}
