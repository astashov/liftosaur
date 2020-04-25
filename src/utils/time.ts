import { StringUtils } from "./string";

export namespace TimeUtils {
  export function formatHHMM(ms: number): string {
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    const hours = Math.floor(ms / 1000 / 60 / 60);

    const result = [hours.toString(), StringUtils.pad(minutes.toString(), 2)].join(":");

    return result;
  }
}
