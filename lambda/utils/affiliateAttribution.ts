import type { IAffiliateData } from "../../src/types";
import type { IAffiliateDao } from "../dao/affiliateDao";
import type { IPaymentDao } from "../dao/paymentDao";

export interface IAffiliateAttributionEntry {
  affiliateId: string;
  timestamp: number;
  type: "coupon" | "program";
}

export function AffiliateAttribution_ofStorage(
  affiliates: Partial<Record<string, IAffiliateData | number>> | undefined
): IAffiliateAttributionEntry[] {
  const entries: IAffiliateAttributionEntry[] = [];
  for (const [affiliateId, value] of Object.entries(affiliates || {})) {
    if (typeof value === "number") {
      entries.push({ affiliateId, timestamp: value, type: "program" });
    } else if (value != null) {
      entries.push({ affiliateId, timestamp: value.timestamp || 0, type: value.type || "program" });
    }
  }
  return entries;
}

export function AffiliateAttribution_ofRows(rows: IAffiliateDao[]): IAffiliateAttributionEntry[] {
  return rows.map((row) => ({
    affiliateId: row.affiliateId,
    timestamp: row.timestamp || 0,
    type: row.type || "program",
  }));
}

export function AffiliateAttribution_merge(...lists: IAffiliateAttributionEntry[][]): IAffiliateAttributionEntry[] {
  const byId: Partial<Record<string, IAffiliateAttributionEntry>> = {};
  for (const entry of lists.flat()) {
    const existing = byId[entry.affiliateId];
    if (!existing || entry.timestamp < existing.timestamp) {
      byId[entry.affiliateId] = entry;
    }
  }
  return Object.values(byId).filter((e): e is IAffiliateAttributionEntry => e != null);
}

export function AffiliateAttribution_first(
  entries: IAffiliateAttributionEntry[]
): IAffiliateAttributionEntry | undefined {
  let first: IAffiliateAttributionEntry | undefined;
  for (const entry of entries) {
    if (
      !first ||
      entry.timestamp < first.timestamp ||
      (entry.timestamp === first.timestamp && entry.affiliateId < first.affiliateId)
    ) {
      first = entry;
    }
  }
  return first;
}

// A coupon is redeemed on an existing subscription too (EXISTING/EXPIRED eligibility, stacked intro offer),
// so coupon credit starts at the redemption.
export function AffiliateAttribution_isEligiblePayment(
  payment: IPaymentDao,
  entry: IAffiliateAttributionEntry
): boolean {
  if (payment.paymentType === "refund" || payment.isTest) {
    return false;
  }
  if (entry.type === "coupon") {
    return payment.timestamp >= entry.timestamp;
  }
  return payment.subscriptionStartTimestamp != null && payment.subscriptionStartTimestamp > entry.timestamp;
}
