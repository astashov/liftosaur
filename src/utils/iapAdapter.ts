export interface IIapPurchase {
  id: string;
  transactionId?: string;
  transactionDate?: number;
  productId: string;
  purchaseToken?: string;
  currency?: string;
  price?: number;
  // The product this subscription will renew as, when a plan switch is queued (iOS). A switch
  // re-delivers the existing transaction with this set, so it's part of the purchase-event dedup key.
  renewsAsProductId?: string;
}

export interface IIapPurchaseError {
  code: string;
  message: string;
  productId?: string;
}

export interface IIapApplePromoOffer {
  identifier: string;
  keyIdentifier: string;
  nonce: string;
  signature: string;
  timestamp: number;
}

export interface IIapSubscriptionOffer {
  id: string;
  displayPrice: string;
  offerTokenAndroid?: string;
}

export interface IIapSubscriptionProduct {
  id: string;
  displayPrice: string;
  subscriptionOffers: IIapSubscriptionOffer[];
}

export interface IIapInAppProduct {
  id: string;
  displayPrice: string;
}

export interface IIapActiveSubscription {
  productId: string;
  isActive: boolean;
  autoRenew: boolean;
  expirationDate?: number;
  purchaseTokenAndroid?: string;
  // The product the subscription will renew as, when the user has queued a plan switch that takes
  // effect next billing period (productId stays the current plan until then). undefined when no
  // switch is pending. iOS only for now — Android deferred changes aren't exposed client-side.
  pendingProductId?: string;
}

export type IIapAndroidReplacementMode = "deferred" | "with-time-proration";

export interface IIapRequestSubscriptionArgs {
  sku: string;
  applePromo?: IIapApplePromoOffer;
  googleOfferId?: string;
  androidOldPurchaseToken?: string;
  androidOldProductId?: string;
  androidReplacementMode?: IIapAndroidReplacementMode;
}

export interface IIapAdapter {
  initConnection(): Promise<void>;
  endConnection(): Promise<void>;
  fetchSubscriptions(skus: string[]): Promise<IIapSubscriptionProduct[]>;
  fetchInAppProducts(skus: string[]): Promise<IIapInAppProduct[]>;
  getAvailablePurchases(): Promise<IIapPurchase[]>;
  getActiveSubscriptions(): Promise<IIapActiveSubscription[]>;
  requestSubscription(args: IIapRequestSubscriptionArgs): Promise<void>;
  openManageSubscriptions(): Promise<void>;
  requestInAppProduct(args: { sku: string }): Promise<void>;
  finishTransaction(purchase: IIapPurchase): Promise<void>;
  getReceiptDataIOS(): Promise<string | undefined>;
  getReceiptIOS(): Promise<string | undefined>;
  presentCodeRedemptionSheetIOS(): Promise<boolean>;
  onPurchaseUpdated(handler: (purchase: IIapPurchase) => void | Promise<void>): () => void;
  onPurchaseError(handler: (error: IIapPurchaseError) => void | Promise<void>): () => void;
}
