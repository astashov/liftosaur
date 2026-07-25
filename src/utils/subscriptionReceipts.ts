import { ISubscriptionReceipt } from "../types";

export function SubscriptionReceipts_cleanupApple(
  apple: ISubscriptionReceipt[],
  verdicts: ReadonlyMap<string, boolean>
): ISubscriptionReceipt[] {
  const valid = apple.filter((r) => verdicts.get(r.value) === true);
  const newestValid = valid.reduce<ISubscriptionReceipt | undefined>(
    (newest, r) => (newest == null || r.createdAt >= newest.createdAt ? r : newest),
    undefined
  );
  // Receipts without a verdict appeared after verification started (sync merge or store restore) and
  // must be kept - deciding from a stale snapshot is how valid receipts used to get tombstoned
  // account-wide. Collapsing valid ones to a single newest receipt is still required: legacy Apple
  // receipts are tens of KB, differ on every refresh, and all verify true while the account is
  // active, so per-receipt pruning would let the array grow unboundedly.
  const result = apple.filter((r) => !verdicts.has(r.value) || r === newestValid);
  return result.length === apple.length ? apple : result;
}
