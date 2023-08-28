import { Utils } from "../utils";
import { IDI } from "../utils/di";

export const subscriptionDetailsTableNames = {
  dev: {
    subscriptionDetails: "lftSubscriptionDetailsDev",
  },
  prod: {
    subscriptionDetails: "lftSubscriptionDetails",
  },
} as const;

export interface ISubscriptionDetailsDao {
  userId: string;
  type: "apple" | "google";
  product: string;
  isTrial: boolean;
  isPromo: boolean;
  isActive: boolean;
  expires: number;
  promoCode?: string;
}

export class SubscriptionDetailsDao {
  constructor(private readonly di: IDI) {}

  public async getAll(userIds: string[]): Promise<ISubscriptionDetailsDao[]> {
    const env = Utils.getEnv();
    return this.di.dynamo.batchGet<ISubscriptionDetailsDao>({
      tableName: subscriptionDetailsTableNames[env].subscriptionDetails,
      keys: userIds.map((uid) => ({ userId: uid })),
    });
  }

  public async add(subscriptionDetails: ISubscriptionDetailsDao): Promise<void> {
    const env = Utils.getEnv();
    await this.di.dynamo.put({
      tableName: subscriptionDetailsTableNames[env].subscriptionDetails,
      item: { ...subscriptionDetails, ts: Date.now() },
    });
  }
}
