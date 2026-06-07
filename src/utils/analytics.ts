import { IAttributionData } from "../models/state";

export interface IAnalyticsPurchaseEvent {
  productId: string;
  price: number;
  currency: string;
  transactionId?: string;
  transactionDate?: number;
}

export interface IAnalyticsInitOptions {
  userId?: string;
  onAttribution: (data: IAttributionData) => void;
}

export function Analytics_initialize(_opts: IAnalyticsInitOptions): () => void {
  return () => undefined;
}

export function Analytics_setUserId(_userId: string): void {}

export function Analytics_trackFinishWorkout(): void {}

export function Analytics_trackSignUp(): void {}

export function Analytics_trackPurchase(_event: IAnalyticsPurchaseEvent): void {}

export const Analytics_platform = "web";

export type { IAttributionData };
