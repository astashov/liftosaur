import { IAffiliateData } from "../../src/types";
import { CollectionUtils } from "../../src/utils/collection";
import { ObjectUtils } from "../../src/utils/object";
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
  affiliatesCoupons?: Partial<Record<string, number>>;
  platforms: { name: string; version?: string }[];
  subscriptions: ("apple" | "google")[];
  year: number;
  month: number;
  day: number;
  referrer?: string;
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

  public async getFirstEventTimestamp(userId: string): Promise<number | undefined> {
    const event = await this.di.dynamo.get<ILogDao>({
      tableName: logTableNames[Utils.getEnv()].logs,
      key: { userId, action: "ls-initialize-user" },
    });
    return event?.ts || undefined;
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
    maybeAffiliates?: Partial<Record<string, IAffiliateData>>,
    referrer?: string
  ): Promise<void> {
    const env = Utils.getEnv();
    const item = await this.di.dynamo.get<ILogDao>({ tableName: logTableNames[env].logs, key: { userId, action } });
    const itemProgramAffiliates = item?.affiliates || {};
    const programAffiliates = ObjectUtils.mapValues(
      ObjectUtils.filter(maybeAffiliates || {}, (k, v) => v?.type === "program"),
      (a: IAffiliateData | undefined) => a?.timestamp
    );
    const combinedProgramAffiliates = [...Object.keys(programAffiliates), ...Object.keys(itemProgramAffiliates)].reduce<
      Partial<Record<string, number>>
    >((memo, key) => {
      const minTs = Math.min(itemProgramAffiliates[key] || Infinity, programAffiliates[key] || Infinity);
      memo[key] = minTs;
      return memo;
    }, {});
    const couponAffiliates = ObjectUtils.mapValues(
      ObjectUtils.filter(maybeAffiliates || {}, (k, v) => v?.type === "coupon"),
      (a: IAffiliateData | undefined) => a?.timestamp
    );
    const itemCouponAffiliates = item?.affiliatesCoupons || {};
    const combinedCouponAffiliates = [...Object.keys(couponAffiliates), ...Object.keys(itemCouponAffiliates)].reduce<
      Partial<Record<string, number>>
    >((memo, key) => {
      const minTs = Math.min(itemCouponAffiliates[key] || Infinity, couponAffiliates[key] || Infinity);
      memo[key] = minTs;
      return memo;
    }, {});
    const combinedAffiliates = { ...combinedProgramAffiliates, ...combinedCouponAffiliates };
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
      await Promise.all([
        affiliateDao.putIfNotExists(
          Object.keys(combinedProgramAffiliates).map((affiliateId) => ({
            affiliateId,
            userId,
            timestamp: combinedProgramAffiliates[affiliateId],
            type: "program",
          }))
        ),
        affiliateDao.putIfNotExists(
          Object.keys(combinedCouponAffiliates).map((affiliateId) => ({
            affiliateId,
            userId,
            timestamp: combinedCouponAffiliates[affiliateId],
            type: "coupon",
          }))
        ),
      ]);
      await this.di.dynamo.update({
        tableName: logTableNames[env].logs,
        key: { userId, action },
        expression:
          "SET #ts = :timestamp, #cnt = :cnt, #affiliates = :affiliates, #affiliatesCoupons = :affiliatesCoupons, #platforms = :platforms, #subscriptions = :subscriptions, #year = :year, #month = :month, #day = :day, #referrer = :referrer",
        attrs: {
          "#ts": "ts",
          "#cnt": "cnt",
          "#affiliates": "affiliates",
          "#affiliatesCoupons": "affiliatesCoupons",
          "#platforms": "platforms",
          "#subscriptions": "subscriptions",
          "#year": "year",
          "#month": "month",
          "#day": "day",
          "#referrer": "referrer",
        },
        values: {
          ":timestamp": Date.now(),
          ":cnt": count + 1,
          ":affiliates": combinedProgramAffiliates,
          ":affiliatesCoupons": combinedCouponAffiliates,
          ":platforms": platforms,
          ":subscriptions": subscriptions,
          ":year": year,
          ":month": month,
          ":day": day,
          ":referrer": referrer || "",
        },
      });
    } else {
      await this.di.dynamo.update({
        tableName: logTableNames[env].logs,
        key: { userId, action },
        expression:
          "SET #ts = :timestamp, #cnt = :cnt, #platforms = :platforms, #subscriptions = :subscriptions, #year = :year, #month = :month, #day = :day, #referrer = :referrer",
        attrs: {
          "#ts": "ts",
          "#cnt": "cnt",
          "#platforms": "platforms",
          "#subscriptions": "subscriptions",
          "#year": "year",
          "#month": "month",
          "#day": "day",
          "#referrer": "referrer",
        },
        values: {
          ":timestamp": Date.now(),
          ":cnt": count + 1,
          ":platforms": platforms,
          ":subscriptions": subscriptions,
          ":year": year,
          ":month": month,
          ":day": day,
          ":referrer": referrer || "",
        },
      });
    }
  }
}
