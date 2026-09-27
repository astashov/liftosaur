import type { IPaymentDao } from "../dao/paymentDao";

export type IPaymentPlan = "monthly" | "yearly" | "lifetime" | "other";

export interface IPaymentMixEntry {
  currency: string;
  plan: IPaymentPlan;
  count: number;
  trials: number;
  share: number;
}

export interface IPaymentMixInput extends Pick<IPaymentDao, "currency" | "productId" | "isFreeTrialPayment"> {
  share: number;
}

const PLAN_ORDER: IPaymentPlan[] = ["monthly", "yearly", "lifetime", "other"];
const LEADING_CURRENCIES = ["USD", "EUR"];

function currencyRank(currency: string): number {
  const index = LEADING_CURRENCIES.indexOf(currency);
  return index === -1 ? LEADING_CURRENCIES.length : index;
}

export function PaymentMix_plan(productId: string): IPaymentPlan {
  if (productId.indexOf("lifetime") !== -1) {
    return "lifetime";
  }
  if (productId.indexOf("yearly") !== -1) {
    return "yearly";
  }
  if (productId.indexOf("montly") !== -1 || productId.indexOf("monthly") !== -1) {
    return "monthly";
  }
  return "other";
}

export function PaymentMix_ofPayments(payments: IPaymentMixInput[]): IPaymentMixEntry[] {
  const byKey: Record<string, IPaymentMixEntry> = {};
  for (const payment of payments) {
    const currency = payment.currency || "USD";
    const plan = PaymentMix_plan(payment.productId);
    const key = `${currency}|${plan}`;
    byKey[key] = byKey[key] || { currency, plan, count: 0, trials: 0, share: 0 };
    byKey[key].count += 1;
    byKey[key].trials += payment.isFreeTrialPayment ? 1 : 0;
    byKey[key].share += payment.share;
  }
  return Object.values(byKey).sort(
    (a, b) =>
      currencyRank(a.currency) - currencyRank(b.currency) ||
      a.currency.localeCompare(b.currency) ||
      PLAN_ORDER.indexOf(a.plan) - PLAN_ORDER.indexOf(b.plan)
  );
}
