import { StringUtils } from "./string";

export namespace TimeUtils {
  export function formatHHMM(ms: number): string {
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    const hours = Math.floor(ms / 1000 / 60 / 60);

    const result = [StringUtils.pad(hours.toString(), 2), StringUtils.pad(minutes.toString(), 2)].join(":");

    return result;
  }

  export function formatHOrMin(ms: number): { value: string; unit: "h" | "min" } {
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    const hours = Math.floor(ms / 1000 / 60 / 60);
    if (hours > 0) {
      return { value: formatHHMM(ms), unit: "h" };
    } else {
      return { value: `${minutes}`, unit: "min" };
    }
  }

  export function formatHH(ms: number): string {
    const hours = Math.floor(ms / 1000 / 60 / 60);
    return StringUtils.pad(hours.toString(), 2);
  }

  export function formatMM(ms: number): string {
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    return StringUtils.pad(minutes.toString(), 2);
  }

  export function formatSS(ms: number): string {
    const seconds = Math.floor((ms / 1000) % 60);
    return StringUtils.pad(seconds.toString(), 2);
  }

  export function formatMMSS(ms: number): string {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    return [StringUtils.pad(minutes.toString(), 2), StringUtils.pad(seconds.toString(), 2)].join(":");
  }
}
