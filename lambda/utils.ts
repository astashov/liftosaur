export function Utils_getEnv(): "dev" | "prod" {
  return process.env.IS_DEV === "true" ? "dev" : "prod";
}

export function Utils_isLocal(): boolean {
  return process.env.IS_LOCAL === "true";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function log(...str: any[]): void {
  const time = new Date();
  const timeStr = `${prefixTime(time.getHours())}:${prefixTime(time.getMinutes())}:${prefixTime(time.getSeconds())}`;
  console.log("[\x1b[36m" + timeStr + "\x1b[0m]", ...str);
}

function prefixTime(time: number): string {
  return `${time}`.padStart(2, "0");
}
