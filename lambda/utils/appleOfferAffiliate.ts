import type { IPaymentDao } from "../dao/paymentDao";
import { PaymentRevenue_FAMILY_SHARED, PaymentRevenue_isCounted } from "./paymentRevenue";

export const AppleOfferAffiliate_OFFER_CODE_TYPE = 3;

const MONTHLY_SUFFIX = "-monthly";

export interface IAppleOfferFields {
  offerIdentifier?: string;
  offerType?: number;
}

export interface IAppleOfferTransaction extends IAppleOfferFields {
  transactionId: string;
  purchaseDate: number;
  environment?: string;
  inAppOwnershipType?: string;
}

export interface IAppleRenewalOffer extends IAppleOfferFields {
  redeemedAt: number;
}

export interface IAppleOfferAttributionPlan {
  offerIdentifierToSet?: string;
  affiliateRow?: { affiliateId: string; userId: string; timestamp: number; type: "coupon" };
}

// create_affiliate_coupon.ts names the yearly offer `<affiliateId>` and the monthly one `<affiliateId>-monthly`.
export function AppleOfferAffiliate_resolve(
  transaction: IAppleOfferFields,
  affiliateIds: ReadonlySet<string>
): string | undefined {
  const { offerIdentifier, offerType } = transaction;
  if (offerType !== AppleOfferAffiliate_OFFER_CODE_TYPE || !offerIdentifier) {
    return undefined;
  }
  const candidate = offerIdentifier.endsWith(MONTHLY_SUFFIX)
    ? offerIdentifier.slice(0, -MONTHLY_SUFFIX.length)
    : offerIdentifier;
  return affiliateIds.has(candidate) ? candidate : undefined;
}

// With STACK_WITH_INTRO_OFFERS the trial transaction has no offer code; Apple puts the redeemed code in renewal info.
export function AppleOfferAffiliate_renewalOffer(args: {
  notificationType: string;
  transaction: { purchaseDate: number };
  renewal?: IAppleOfferFields | null;
  signedDate?: number;
}): IAppleRenewalOffer | undefined {
  const { renewal } = args;
  if (!renewal?.offerIdentifier) {
    return undefined;
  }
  const offer = { offerIdentifier: renewal.offerIdentifier, offerType: renewal.offerType };
  if (args.notificationType === "SUBSCRIBED") {
    return { ...offer, redeemedAt: args.transaction.purchaseDate };
  }
  if (args.notificationType === "OFFER_REDEEMED" && args.signedDate != null) {
    return { ...offer, redeemedAt: args.signedDate };
  }
  return undefined;
}

export function AppleOfferAffiliate_plan(args: {
  transaction: IAppleOfferTransaction;
  payment?: Pick<IPaymentDao, "userId" | "offerIdentifier" | "isTest" | "inAppOwnershipType">;
  fallbackUserId?: string;
  affiliateIds: ReadonlySet<string>;
  renewalOffer?: IAppleRenewalOffer;
}): IAppleOfferAttributionPlan {
  const { transaction, payment, renewalOffer, affiliateIds } = args;
  const offerIdentifier = transaction.offerIdentifier;
  const offerIdentifierToSet = offerIdentifier && payment && !payment.offerIdentifier ? offerIdentifier : undefined;
  const isExcluded =
    transaction.environment === "Sandbox" ||
    transaction.inAppOwnershipType === PaymentRevenue_FAMILY_SHARED ||
    (payment != null && !PaymentRevenue_isCounted(payment));
  const userId = payment?.userId ?? args.fallbackUserId;
  const transactionAffiliateId = AppleOfferAffiliate_resolve(transaction, affiliateIds);
  const renewalAffiliateId = renewalOffer ? AppleOfferAffiliate_resolve(renewalOffer, affiliateIds) : undefined;
  const affiliateId = transactionAffiliateId ?? renewalAffiliateId;
  const timestamp = transactionAffiliateId ? transaction.purchaseDate : renewalOffer?.redeemedAt;
  if (isExcluded || !userId || !affiliateId || timestamp == null) {
    return offerIdentifierToSet ? { offerIdentifierToSet } : {};
  }
  return {
    offerIdentifierToSet,
    affiliateRow: { affiliateId, userId, timestamp, type: "coupon" },
  };
}
