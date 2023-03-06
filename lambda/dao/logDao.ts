import { CollectionUtils } from "../../src/utils/collection";
import { Utils } from "../utils";
import { IDI } from "../utils/di";
import { AffiliateDao } from "./affiliateDao";

export const logTableNames = {
  dev: {
    logs: "lftLogsDev",
    logsDate: "lftLogsDateDev",
  },
  prod: {
    logs: "lftLogs",
    logsDate: "lftLogsDate",
  },
} as const;

export interface ILogDao {
  userId: string;
  action: string;
  cnt: number;
  ts: number;
  affiliates?: Partial<Record<string, number>>;
  platforms: { name: string; version?: string }[];
  subscriptions: ("apple" | "google")[];
  year: number;
  month: number;
  day: number;
}

export class LogDao {
  constructor(private readonly di: IDI) {}

  public async getAll(): Promise<ILogDao[]> {
    const env = Utils.getEnv();
    return this.di.dynamo.scan({ tableName: logTableNames[env].logs });
  }

  public async getAllSince(ts: number): Promise<ILogDao[]> {
    const env = Utils.getEnv();
    return this.di.dynamo.scan({
      tableName: logTableNames[env].logs,
      filterExpression: "ts > :ts",
      values: { ":ts": ts },
    });
  }

  public async getAllForYearAndMonth(year: number, month: number): Promise<ILogDao[]> {
    const env = Utils.getEnv();
    return this.di.dynamo.query({
      tableName: logTableNames[env].logs,
      indexName: logTableNames[env].logsDate,
      expression: "#month = :month AND #year = :year",
      attrs: { "#month": "month", "#year": "year" },
      values: { ":month": month, ":year": year },
    });
  }

  public async getFinishWorkoutForUsers(userIds: string[]): Promise<ILogDao[]> {
    const env = Utils.getEnv();
    return this.di.dynamo.batchGet<ILogDao>({
      tableName: logTableNames[env].logs,
      keys: userIds.map((uid) => ({ userId: uid, action: "ls-finish-workout" })),
    });
  }

  public async getForUsers(userIds: string[]): Promise<ILogDao[]> {
    const env = Utils.getEnv();
    let results: ILogDao[] = [];
    for (const group of CollectionUtils.inGroupsOf(50, userIds)) {
      results = results.concat(
        (
          await Promise.all(
            group.map((userId) => {
              return this.di.dynamo.query<ILogDao>({
                tableName: logTableNames[env].logs,
                expression: "userId = :userId",
                values: { ":userId": userId },
              });
            })
          )
        ).flat()
      );
    }
    return results;
  }

  public async increment(
    userId: string,
    action: string,
    platform: { name: string; version?: string },
    subscriptions: ("apple" | "google")[],
    maybeAffiliates?: Partial<Record<string, number>>
  ): Promise<void> {
    const env = Utils.getEnv();
    const item = await this.di.dynamo.get<ILogDao>({ tableName: logTableNames[env].logs, key: { userId, action } });
    const affiliates = maybeAffiliates || {};
    const itemAffiliates = item?.affiliates || {};
    const combinedAffiliates = [...Object.keys(affiliates), ...Object.keys(itemAffiliates)].reduce<
      Partial<Record<string, number>>
    >((memo, key) => {
      const minTs = Math.min(itemAffiliates[key] || Infinity, affiliates[key] || Infinity);
      memo[key] = minTs;
      return memo;
    }, {});
    const platforms = [...(item?.platforms || [])];
    // eslint-disable-next-line eqeqeq
    if (!platforms.some((p) => p.name === platform.name && p.version == platform.version)) {
      platforms.push(platform);
    }
    const count: number = item?.cnt || 0;
    const year = new Date().getUTCFullYear();
    const month = new Date().getUTCMonth();
    const day = new Date().getUTCDate();
    if (Object.keys(combinedAffiliates).length > 0) {
      const affiliateDao = new AffiliateDao(this.di);
      await affiliateDao.put(Object.keys(combinedAffiliates).map((affiliateId) => ({ affiliateId, userId })));
      await this.di.dynamo.update({
        tableName: logTableNames[env].logs,
        key: { userId, action },
        expression:
          "SET #ts = :timestamp, #cnt = :cnt, #affiliates = :affiliates, #platforms = :platforms, #subscriptions = :subscriptions, #year = :year, #month = :month, #day = :day",
        attrs: {
          "#ts": "ts",
          "#cnt": "cnt",
          "#affiliates": "affiliates",
          "#platforms": "platforms",
          "#subscriptions": "subscriptions",
          "#year": "year",
          "#month": "month",
          "#day": "day",
        },
        values: {
          ":timestamp": Date.now(),
          ":cnt": count + 1,
          ":affiliates": combinedAffiliates,
          ":platforms": platforms,
          ":subscriptions": subscriptions,
          ":year": year,
          ":month": month,
          ":day": day,
        },
      });
    } else {
      await this.di.dynamo.update({
        tableName: logTableNames[env].logs,
        key: { userId, action },
        expression:
          "SET #ts = :timestamp, #cnt = :cnt, #platforms = :platforms, #subscriptions = :subscriptions, #year = :year, #month = :month, #day = :day",
        attrs: {
          "#ts": "ts",
          "#cnt": "cnt",
          "#platforms": "platforms",
          "#subscriptions": "subscriptions",
          "#year": "year",
          "#month": "month",
          "#day": "day",
        },
        values: {
          ":timestamp": Date.now(),
          ":cnt": count + 1,
          ":platforms": platforms,
          ":subscriptions": subscriptions,
          ":year": year,
          ":month": month,
          ":day": day,
        },
      });
    }
  }
}
