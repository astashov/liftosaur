import { StringUtils_pad } from "./string";

export function TimeUtils_formatHHMM(ms: number): string {
  const minutes = Math.floor((ms / 1000 / 60) % 60);
  const hours = Math.floor(ms / 1000 / 60 / 60);

  const result = [StringUtils_pad(hours.toString(), 2), StringUtils_pad(minutes.toString(), 2)].join(":");

  return result;
}

export function TimeUtils_formatHOrMin(ms: number): { value: string; unit: "h" | "min" } {
  const minutes = Math.floor((ms / 1000 / 60) % 60);
  const hours = Math.floor(ms / 1000 / 60 / 60);
  if (hours > 0) {
    return { value: TimeUtils_formatHHMM(ms), unit: "h" };
  } else {
    return { value: `${minutes}`, unit: "min" };
  }
}

export function TimeUtils_formatHH(ms: number): string {
  const hours = Math.floor(ms / 1000 / 60 / 60);
  return StringUtils_pad(hours.toString(), 2);
}

export function TimeUtils_formatMM(ms: number): string {
  const minutes = Math.floor((ms / 1000 / 60) % 60);
  return StringUtils_pad(minutes.toString(), 2);
}

export function TimeUtils_formatSS(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  return StringUtils_pad(seconds.toString(), 2);
}

export function TimeUtils_formatMMSS(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / 1000 / 60) % 60);
  return [StringUtils_pad(minutes.toString(), 2), StringUtils_pad(seconds.toString(), 2)].join(":");
}

export function TimeUtils_formatUTCHHMM(ms: number): string {
  const date = new Date(ms);
  const hours = StringUtils_pad(date.getUTCHours().toString(), 2);
  const minutes = StringUtils_pad(date.getUTCMinutes().toString(), 2);
  return [hours, minutes].join(":");
}
