export interface IAppleSubscriptionStatusEntry {
  originalTransactionId: string;
  signedTransactionInfo?: string;
  signedRenewalInfo?: string;
}

export interface IAppleSubscriptionStatusResponse {
  data?: { lastTransactions?: IAppleSubscriptionStatusEntry[] }[];
}

// /inApps/v1/subscriptions/{id} returns every subscription of the customer, not only the one asked for.
export function AppleSubscriptionStatus_select(
  status: IAppleSubscriptionStatusResponse,
  originalTransactionId: string
): IAppleSubscriptionStatusEntry | undefined {
  for (const group of status.data || []) {
    const entry = (group.lastTransactions || []).find((t) => t.originalTransactionId === originalTransactionId);
    if (entry) {
      return entry;
    }
  }
  return undefined;
}
