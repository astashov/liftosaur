import {
  IIapActiveSubscription,
  IIapAdapter,
  IIapInAppProduct,
  IIapPurchase,
  IIapPurchaseError,
  IIapRequestSubscriptionArgs,
  IIapSubscriptionProduct,
} from "../../src/utils/iapAdapter";

export class MockIapAdapter implements IIapAdapter {
  public legacyReceipt: string | undefined = undefined;
  public availablePurchases: IIapPurchase[] = [];
  public activeSubscriptions: IIapActiveSubscription[] = [];
  public openManageSubscriptionsCalled: number = 0;
  public subscriptionProducts: IIapSubscriptionProduct[] = [];
  public inAppProducts: IIapInAppProduct[] = [];
  public productPrices: Record<string, { price?: number; currency?: string }> = {};
  public requestSubscriptionCalls: IIapRequestSubscriptionArgs[] = [];
  public requestInAppProductCalls: { sku: string }[] = [];
  public finishTransactionCalls: IIapPurchase[] = [];
  public initConnectionCalled: number = 0;
  public endConnectionCalled: number = 0;
  public presentCodeRedemptionCalled: number = 0;
  public presentCodeRedemptionResult: boolean = true;

  private purchaseListeners: Array<(p: IIapPurchase) => void | Promise<void>> = [];
  private errorListeners: Array<(e: IIapPurchaseError) => void | Promise<void>> = [];

  public async initConnection(): Promise<void> {
    this.initConnectionCalled += 1;
  }

  public async endConnection(): Promise<void> {
    this.endConnectionCalled += 1;
  }

  public async fetchSubscriptions(_skus: string[]): Promise<IIapSubscriptionProduct[]> {
    return this.subscriptionProducts;
  }

  public async fetchInAppProducts(_skus: string[]): Promise<IIapInAppProduct[]> {
    return this.inAppProducts;
  }

  public async getProductPrice(productId: string): Promise<{ price?: number; currency?: string }> {
    return this.productPrices[productId] ?? {};
  }

  public async getAvailablePurchases(): Promise<IIapPurchase[]> {
    return this.availablePurchases;
  }

  public async getActiveSubscriptions(): Promise<IIapActiveSubscription[]> {
    return this.activeSubscriptions;
  }

  public async requestSubscription(args: IIapRequestSubscriptionArgs): Promise<void> {
    this.requestSubscriptionCalls.push(args);
  }

  public async openManageSubscriptions(): Promise<void> {
    this.openManageSubscriptionsCalled += 1;
  }

  public async requestInAppProduct(args: { sku: string }): Promise<void> {
    this.requestInAppProductCalls.push(args);
  }

  public async finishTransaction(purchase: IIapPurchase): Promise<void> {
    this.finishTransactionCalls.push(purchase);
  }

  public async getReceiptDataIOS(): Promise<string | undefined> {
    return this.legacyReceipt;
  }

  public async getReceiptIOS(): Promise<string | undefined> {
    return this.legacyReceipt;
  }

  public async presentCodeRedemptionSheetIOS(): Promise<boolean> {
    this.presentCodeRedemptionCalled += 1;
    return this.presentCodeRedemptionResult;
  }

  public onPurchaseUpdated(handler: (p: IIapPurchase) => void | Promise<void>): () => void {
    const handled = new Set<string>();
    const wrapped = async (p: IIapPurchase): Promise<void> => {
      const txnId = p.transactionId ?? p.id;
      if (txnId) {
        if (handled.has(txnId)) {
          return;
        }
        handled.add(txnId);
      }
      await handler(p);
    };
    this.purchaseListeners.push(wrapped);
    return () => {
      this.purchaseListeners = this.purchaseListeners.filter((h) => h !== wrapped);
    };
  }

  public onPurchaseError(handler: (e: IIapPurchaseError) => void | Promise<void>): () => void {
    this.errorListeners.push(handler);
    return () => {
      this.errorListeners = this.errorListeners.filter((h) => h !== handler);
    };
  }

  public async emitPurchase(purchase: IIapPurchase): Promise<void> {
    await Promise.all(this.purchaseListeners.map((h) => h(purchase)));
  }

  public async emitError(error: IIapPurchaseError): Promise<void> {
    await Promise.all(this.errorListeners.map((h) => h(error)));
  }
}
