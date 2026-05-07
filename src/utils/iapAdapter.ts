export interface IIapPurchase {
  id: string;
  transactionId?: string;
  productId: string;
  purchaseToken?: string;
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

export interface IIapRequestSubscriptionArgs {
  sku: string;
  applePromo?: IIapApplePromoOffer;
  googleOfferId?: string;
}

export interface IIapAdapter {
  initConnection(): Promise<void>;
  endConnection(): Promise<void>;
  fetchSubscriptions(skus: string[]): Promise<IIapSubscriptionProduct[]>;
  fetchInAppProducts(skus: string[]): Promise<IIapInAppProduct[]>;
  getAvailablePurchases(): Promise<IIapPurchase[]>;
  requestSubscription(args: IIapRequestSubscriptionArgs): Promise<void>;
  requestInAppProduct(args: { sku: string }): Promise<void>;
  finishTransaction(purchase: IIapPurchase): Promise<void>;
  getReceiptDataIOS(): Promise<string | undefined>;
  getReceiptIOS(): Promise<string | undefined>;
  presentCodeRedemptionSheetIOS(): Promise<boolean>;
  onPurchaseUpdated(handler: (purchase: IIapPurchase) => void | Promise<void>): () => void;
  onPurchaseError(handler: (error: IIapPurchaseError) => void | Promise<void>): () => void;
}
