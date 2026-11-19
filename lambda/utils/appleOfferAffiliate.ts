import type { IPaymentDao } from "../dao/paymentDao";

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

export function AppleOfferAffiliate_plan(args: {
  transaction: IAppleOfferTransaction;
  payment?: Pick<IPaymentDao, "userId" | "offerIdentifier" | "isTest">;
  fallbackUserId?: string;
  affiliateIds: ReadonlySet<string>;
}): IAppleOfferAttributionPlan {
  const { transaction, payment } = args;
  const offerIdentifier = transaction.offerIdentifier;
  if (!offerIdentifier) {
    return {};
  }
  const offerIdentifierToSet = payment && !payment.offerIdentifier ? offerIdentifier : undefined;
  const isTest = transaction.environment === "Sandbox" || !!payment?.isTest;
  const userId = payment?.userId ?? args.fallbackUserId;
  const affiliateId = AppleOfferAffiliate_resolve(transaction, args.affiliateIds);
  if (isTest || !userId || !affiliateId) {
    return { offerIdentifierToSet };
  }
  return {
    offerIdentifierToSet,
    affiliateRow: { affiliateId, userId, timestamp: transaction.purchaseDate, type: "coupon" },
  };
}
