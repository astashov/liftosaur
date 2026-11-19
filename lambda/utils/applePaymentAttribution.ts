import { IDI } from "./di";
import { PaymentDao } from "../dao/paymentDao";
import { CouponDao } from "../dao/couponDao";
import { AffiliateDao } from "../dao/affiliateDao";
import { AppleOfferAffiliate_plan, IAppleOfferTransaction } from "./appleOfferAffiliate";

export interface IApplePaymentAttributionResult {
  status: "ok" | "failed";
  offerSet: boolean;
  affiliateId?: string;
}

export async function ApplePaymentAttribution_apply(
  di: IDI,
  args: { transaction: IAppleOfferTransaction; fallbackUserId?: string; affiliateIds?: ReadonlySet<string> }
): Promise<IApplePaymentAttributionResult> {
  const { transaction } = args;
  if (!transaction.offerIdentifier) {
    return { status: "ok", offerSet: false };
  }
  let offerSet = false;
  try {
    const paymentDao = new PaymentDao(di);
    const payment = await paymentDao.getByTransactionId(transaction.transactionId);
    const affiliateIds = args.affiliateIds ?? (await new CouponDao(di).getAffiliateIds());
    const plan = AppleOfferAffiliate_plan({ transaction, payment, fallbackUserId: args.fallbackUserId, affiliateIds });
    if (payment && plan.offerIdentifierToSet) {
      await paymentDao.setOfferIdentifier(payment, plan.offerIdentifierToSet);
      offerSet = true;
    }
    if (plan.affiliateRow) {
      await new AffiliateDao(di).putIfNotExists([plan.affiliateRow]);
      di.log.log(
        `Apple offer attribution: ${transaction.transactionId} -> ${plan.affiliateRow.affiliateId} for ${plan.affiliateRow.userId}`
      );
    }
    return { status: "ok", offerSet, affiliateId: plan.affiliateRow?.affiliateId };
  } catch (e) {
    di.log.log(`Apple offer attribution failed for ${transaction.transactionId}`, e);
    return { status: "failed", offerSet };
  }
}
