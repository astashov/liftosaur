import {
  IHistoryRecord,
  ISet,
  IWeight,
} from "../types";

type OneRMTriplet = {
  max1RM?: IWeight;
  max1RMHistoryRecord?: IHistoryRecord;
  max1RMSet?: ISet;
};

const data = new Map<string, OneRMTriplet>();
const subs = new Map<string, Set<(v: OneRMTriplet | undefined) => void>>();

function emit(key: string) {
  const value = data.get(key);
  const set = subs.get(key);
  if (!set) return;
  for (const fn of set) fn(value);
}

export function setOneRM(key: string, value: OneRMTriplet) {
  data.set(key, value);
  emit(key);
}

export function getOneRM(key: string): OneRMTriplet | undefined {
  return data.get(key);
}

export function subscribeOneRM(
  key: string,
  cb: (v: OneRMTriplet | undefined) => void
): () => void {
  let set = subs.get(key);
  if (!set) subs.set(key, (set = new Set()));
  set.add(cb);

  cb(data.get(key));
  return () => {
    set!.delete(cb);
    if (set!.size === 0) subs.delete(key);
  };
}