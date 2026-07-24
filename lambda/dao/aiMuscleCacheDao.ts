import { Utils_getEnv } from "../utils";
import { IDI } from "../utils/di";

const tableNames = {
  dev: {
    aiMuscleCaches: "lftAiMuscleCachesDev",
  },
  prod: {
    aiMuscleCaches: "lftAiMuscleCaches",
  },
} as const;

export interface IAiMuscleCacheDao {
  key: string;
  name: string;
  response: string;
  timestamp: number;
  isSuccess: boolean;
}

export class AiMuscleCacheDao {
  constructor(private readonly di: IDI) {}

  public getKeyFromName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[^a-z0-9]+/g, "-");
  }

  public async create(record: Omit<IAiMuscleCacheDao, "key" | "timestamp">): Promise<void> {
    const env = Utils_getEnv();
    const key = this.getKeyFromName(record.name);
    try {
      await this.di.dynamo.put({
        tableName: tableNames[env].aiMuscleCaches,
        item: {
          ...record,
          key,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      this.di.log.log("Error saving AI Muscle Cache:", error);
    }
  }

  public async getByName(name: string): Promise<IAiMuscleCacheDao | undefined> {
    const env = Utils_getEnv();
    const key = this.getKeyFromName(name);
    return this.di.dynamo.get<IAiMuscleCacheDao>({
      tableName: tableNames[env].aiMuscleCaches,
      key: { key },
    });
  }
}
