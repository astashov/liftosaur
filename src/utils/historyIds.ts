import { IEither } from "./types";

export const HistoryIds_MAX = 100;

export function HistoryIds_parse(raw: string): IEither<number[], string> {
  const ids: number[] = [];
  for (const part of raw.split(",")) {
    if (part === "") {
      continue;
    }
    const id = Number(part);
    if (!Number.isSafeInteger(id)) {
      return { success: false, error: `Invalid history id: ${part}` };
    }
    if (ids.indexOf(id) === -1) {
      ids.push(id);
    }
  }
  if (ids.length > HistoryIds_MAX) {
    return { success: false, error: `At most ${HistoryIds_MAX} history ids per request` };
  }
  return { success: true, data: ids };
}
