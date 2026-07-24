import {
  IIapActiveSubscription,
  IIapAdapter,
  IIapInAppProduct,
  IIapPurchase,
  IIapPurchaseError,
  IIapRequestSubscriptionArgs,
  IIapSubscriptionProduct,
} from "./iapAdapter";

export class IapAdapter implements IIapAdapter {
  public async initConnection(): Promise<void> {}
  public async endConnection(): Promise<void> {}
  public async fetchSubscriptions(_skus: string[]): Promise<IIapSubscriptionProduct[]> {
    return [];
  }
  public async fetchInAppProducts(_skus: string[]): Promise<IIapInAppProduct[]> {
    return [];
  }
  public async getProductPrice(_productId: string): Promise<{ price?: number; currency?: string }> {
    return {};
  }
  public async getAvailablePurchases(): Promise<IIapPurchase[]> {
    return [];
  }
  public async getActiveSubscriptions(): Promise<IIapActiveSubscription[]> {
    return [];
  }
  public async requestSubscription(_args: IIapRequestSubscriptionArgs): Promise<void> {}
  public async openManageSubscriptions(): Promise<void> {}
  public async requestInAppProduct(_args: { sku: string }): Promise<void> {}
  public async finishTransaction(_purchase: IIapPurchase): Promise<void> {}
  public async getReceiptDataIOS(): Promise<string | undefined> {
    return undefined;
  }
  public async getReceiptIOS(): Promise<string | undefined> {
    return undefined;
  }
  public async presentCodeRedemptionSheetIOS(): Promise<boolean> {
    return false;
  }
  public onPurchaseUpdated(_handler: (purchase: IIapPurchase) => void): () => void {
    return () => {};
  }
  public onPurchaseError(_handler: (error: IIapPurchaseError) => void): () => void {
    return () => {};
  }
}
