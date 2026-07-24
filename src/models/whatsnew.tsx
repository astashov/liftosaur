import { ObjectUtils_keys } from "../utils/object";
import { UrlUtils_build } from "../utils/url";
import { WhatsNewParser_parseAll } from "./whatsnewParser";

export interface IWhatsNew {
  title: string;
  body: string;
}

let cached: Record<string, IWhatsNew> | undefined;

export function WhatsNew_all(): Record<string, IWhatsNew> {
  if (!cached) {
    const result: Record<string, IWhatsNew> = {};
    for (const entry of WhatsNewParser_parseAll()) {
      result[entry.dateStr] = { title: entry.title, body: entry.body };
    }
    cached = result;
  }
  return cached;
}

export function WhatsNew_doesHaveNewUpdates(lastDateStr?: string): boolean {
  if (lastDateStr == null) {
    return false;
  } else {
    return Object.keys(WhatsNew_newUpdates(lastDateStr)).length > 0;
  }
}

export function WhatsNew_newUpdates(lastDateStr: string): Record<string, IWhatsNew> {
  if (typeof window !== "undefined" && window.location?.href) {
    const url = UrlUtils_build(window.location.href);
    const forcedUserEmail = url.searchParams.get("forceuseremail");
    if (forcedUserEmail != null) {
      return {};
    }
  }
  const whatsNew = WhatsNew_all();
  const lastDate = parseInt(lastDateStr, 10);
  return ObjectUtils_keys(whatsNew).reduce<Record<string, IWhatsNew>>((memo, dateStr) => {
    const date = parseInt(dateStr, 10);
    if (date > lastDate) {
      memo[dateStr] = whatsNew[dateStr];
    }
    return memo;
  }, {});
}
