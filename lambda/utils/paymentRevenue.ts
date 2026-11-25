import type { IPaymentDao } from "../dao/paymentDao";

export const PaymentRevenue_FAMILY_SHARED = "FAMILY_SHARED";

// Apple charges only the family organizer; each family member's FAMILY_SHARED copy repeats the organizer's price.
export function PaymentRevenue_isCounted(payment: Pick<IPaymentDao, "isTest" | "inAppOwnershipType">): boolean {
  return !payment.isTest && payment.inAppOwnershipType !== PaymentRevenue_FAMILY_SHARED;
}
