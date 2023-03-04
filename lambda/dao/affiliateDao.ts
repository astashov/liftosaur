import { Utils } from "../utils";
import { IDI } from "../utils/di";

const tableNames = {
  dev: {
    affiliates: "lftAffiliatesDev",
  },
  prod: {
    affiliates: "lftAffiliates",
  },
} as const;

export interface IAffiliateDao {
  affiliateId: string;
  userId: string;
}

export class AffiliateDao {
  constructor(private readonly di: IDI) {}

  public async getUserIds(affiliateId: string): Promise<string[]> {
    const env = Utils.getEnv();
    const result = await this.di.dynamo.query<IAffiliateDao>({
      tableName: tableNames[env].affiliates,
      expression: "affiliateId = :affiliateId",
      values: { ":affiliateId": affiliateId },
    });
    return result.map((r) => r.userId);
  }

  public async put(items: { affiliateId: string; userId: string }[]): Promise<void> {
    if (items.length === 0) {
      return;
    }
    const env = Utils.getEnv();
    await this.di.dynamo.batchPut({ tableName: tableNames[env].affiliates, items });
  }
}
