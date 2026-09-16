export interface IPushMessage {
  type: "storage";
  originalId: number;
}

export function PushMessage_parse(raw: { reason?: string; originalId?: string | number }): IPushMessage | undefined {
  if (raw.reason !== "storage") {
    return undefined;
  }
  const originalId = typeof raw.originalId === "number" ? raw.originalId : Number(raw.originalId);
  if (!Number.isSafeInteger(originalId) || originalId <= 0) {
    return undefined;
  }
  return { type: "storage", originalId };
}
