import { IDI } from "./di";
import { PaymentDao } from "../dao/paymentDao";
import { CouponDao } from "../dao/couponDao";
import { AffiliateDao } from "../dao/affiliateDao";
import { AppleOfferAffiliate_plan, IAppleOfferTransaction, IAppleRenewalOffer } from "./appleOfferAffiliate";

export interface IApplePaymentAttributionResult {
  status: "ok" | "failed";
  offerSet: boolean;
  inserted: boolean;
  affiliateId?: string;
}

export async function ApplePaymentAttribution_apply(
  di: IDI,
  args: {
    transaction: IAppleOfferTransaction;
    fallbackUserId?: string;
    affiliateIds?: ReadonlySet<string>;
    renewalOffer?: IAppleRenewalOffer;
  }
): Promise<IApplePaymentAttributionResult> {
  const { transaction, renewalOffer } = args;
  if (!transaction.offerIdentifier && !renewalOffer?.offerIdentifier) {
    return { status: "ok", offerSet: false, inserted: false };
  }
  let offerSet = false;
  let inserted = false;
  try {
    const paymentDao = new PaymentDao(di);
    const payment = await paymentDao.getByTransactionId(transaction.transactionId);
    const affiliateIds = args.affiliateIds ?? (await new CouponDao(di).getAffiliateIds());
    const plan = AppleOfferAffiliate_plan({
      transaction,
      payment,
      fallbackUserId: args.fallbackUserId,
      affiliateIds,
      renewalOffer,
    });
    if (payment && plan.offerIdentifierToSet) {
      await paymentDao.setOfferIdentifier(payment, plan.offerIdentifierToSet);
      offerSet = true;
    }
    if (plan.affiliateRow) {
      inserted = (await new AffiliateDao(di).putIfNotExists([plan.affiliateRow])) > 0;
      di.log.log(
        `Apple offer attribution: ${transaction.transactionId} -> ${plan.affiliateRow.affiliateId} for ${plan.affiliateRow.userId}`
      );
    }
    return { status: "ok", offerSet, inserted, affiliateId: plan.affiliateRow?.affiliateId };
  } catch (e) {
    di.log.log(`Apple offer attribution failed for ${transaction.transactionId}`, e);
    return { status: "failed", offerSet, inserted };
  }
}
