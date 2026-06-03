import { Utils_getEnv } from "../utils";
import { IDI } from "../utils/di";
import { ILimitedUserDao, UserDao } from "./userDao";
import { IPaymentDao, PaymentDao } from "./paymentDao";
import { LogDao } from "./logDao";
import {
  CollectionUtils_inGroupsOf,
  CollectionUtils_groupByKey,
  CollectionUtils_groupByKeyUniq,
  CollectionUtils_sortByExpr,
  CollectionUtils_sortBy,
  CollectionUtils_sortByMultiple,
} from "../../src/utils/collection";
import { IAffiliateData } from "../../src/pages/affiliateDashboard/affiliateDashboardContent";
import { PriceUtils_exchangeRate } from "../../src/utils/price";

const tableNames = {
  dev: {
    affiliates: "lftAffiliatesDev",
    affiliatesUserIdIndex: "lftAffiliatesUserIdDev",
  },
  prod: {
    affiliates: "lftAffiliates",
    affiliatesUserIdIndex: "lftAffiliatesUserId",
  },
} as const;

export interface IAffiliateDao {
  affiliateId: string;
  userId: string;
  timestamp?: number;
  type?: "coupon" | "program";
}

export interface IAffiliateMonthlyPayment {
  month: string;
  revenue: number;
  count: number;
  programUsers: number;
  couponUsers: number;
  programUsersTotal: number;
  couponUsersTotal: number;
}

export interface IAffiliateDashboardSummary {
  totalUsers: number;
  signedUpUsers: number;
  paidUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  programUsers: number;
  couponUsers: number;
  programRevenue: number;
  couponRevenue: number;
}

export class AffiliateDao {
  constructor(private readonly di: IDI) {}

  public async getUserIds(affiliateId: string): Promise<string[]> {
    const env = Utils_getEnv();
    const result = await this.di.dynamo.query<IAffiliateDao>({
      tableName: tableNames[env].affiliates,
      expression: "affiliateId = :affiliateId",
      values: { ":affiliateId": affiliateId },
    });
    return result.map((r) => r.userId);
  }

  public async getAffiliatesForUser(userId: string): Promise<IAffiliateDao[]> {
    const env = Utils_getEnv();
    const result = await this.di.dynamo.query<IAffiliateDao>({
      tableName: tableNames[env].affiliates,
      indexName: tableNames[env].affiliatesUserIdIndex,
      expression: "userId = :userId",
      values: { ":userId": userId },
    });
    return result;
  }

  public async getAffiliatesForUsers(allUserIds: string[]): Promise<Partial<Record<string, IAffiliateDao[]>>> {
    const groups = CollectionUtils_inGroupsOf(50, allUserIds);
    const env = Utils_getEnv();
    const allResults: IAffiliateDao[] = [];

    for (const group of groups) {
      const groupResults = await Promise.all(
        group.map(async (userId) => {
          return this.di.dynamo.query<IAffiliateDao>({
            tableName: tableNames[env].affiliates,
            indexName: tableNames[env].affiliatesUserIdIndex,
            expression: "userId = :userId",
            values: { ":userId": userId },
          });
        })
      );
      allResults.push(...groupResults.flat());
    }

    return CollectionUtils_groupByKey(allResults, "userId");
  }

  public async put(items: { affiliateId: string; userId: string }[]): Promise<void> {
    if (items.length === 0) {
      return;
    }
    const env = Utils_getEnv();
    await this.di.dynamo.batchPut({ tableName: tableNames[env].affiliates, items });
  }

  public async putIfNotExists(
    items: { affiliateId: string; userId: string; timestamp?: number; type: "coupon" | "program" }[]
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }
    const env = Utils_getEnv();

    await Promise.all(
      items.map((item) =>
        this.di.dynamo.putIfNotExists({
          tableName: tableNames[env].affiliates,
          item: { ...item },
          partitionKey: "affiliateId",
          sortKey: "userId",
        })
      )
    );
  }

  private async getAffiliatedUsers(affiliateId: string): Promise<
    Array<{
      userId: string;
      user?: ILimitedUserDao;
      affiliateTimestamp: number;
      isFirstAffiliate: boolean;
      affiliateType?: "coupon" | "program";
    }>
  > {
    const affiliatedUserIds = await this.getUserIds(affiliateId);

    if (affiliatedUserIds.length === 0) {
      return [];
    }

    const userDao = new UserDao(this.di);
    const affiliatedUsers = await userDao.getLimitedByIds(affiliatedUserIds);
    const restUserIds = affiliatedUserIds.filter((userId) => !affiliatedUsers.some((user) => user.id === userId));
    const userIdToAffiliates = await this.getAffiliatesForUsers(restUserIds);
    const idToAffiliatedUser = CollectionUtils_groupByKeyUniq(affiliatedUsers, "id");

    const users = affiliatedUserIds.map((userId) => {
      const user = idToAffiliatedUser[userId];
      if (user) {
        const affiliates = user.storage?.affiliates || {};
        const affiliateValue = affiliates[affiliateId];
        const affiliateTimestamp =
          (typeof affiliateValue === "number" ? affiliateValue : affiliates[affiliateId]?.timestamp) || 0;
        const affiliateType = typeof affiliateValue === "number" ? "program" : affiliateValue?.type || "program";

        const sortedAffiliates = Object.entries(affiliates).sort(
          ([a, av], [b, bv]) =>
            ((typeof av === "number" ? av : av?.timestamp) || 0) - ((typeof bv === "number" ? bv : bv?.timestamp) || 0)
        );
        const isFirstAffiliate = sortedAffiliates.length === 0 || sortedAffiliates[0][0] === affiliateId;

        return { userId, user, affiliateTimestamp, isFirstAffiliate, affiliateType };
      } else {
        const affiliates = userIdToAffiliates[userId] || [];
        const sortedAffiliates = CollectionUtils_sortByExpr(affiliates, (e) => e.timestamp || 0);
        const currentAffiliate = sortedAffiliates.find((a) => a.affiliateId === affiliateId);
        const affiliateTimestamp = currentAffiliate?.timestamp || 0;
        const affiliateType = currentAffiliate?.type ?? "program";
        const isFirstAffiliate = sortedAffiliates.length > 0 && sortedAffiliates[0].affiliateId === affiliateId;
        return { userId, user: undefined, affiliateTimestamp, isFirstAffiliate, affiliateType };
      }
    });

    return users;
  }

  private getDollarAmount(payment: IPaymentDao): number {
    const conversion = PriceUtils_exchangeRate(payment.amount, payment.currency || "USD");
    return conversion.success ? conversion.value : 0;
  }

  private async calculateUserRevenue(
    userId: string,
    affiliateTimestamp: number,
    isFirstAffiliate: boolean
  ): Promise<{ userTotalRevenue: number; userMonthlyRevenue: number; eligiblePayments: IPaymentDao[] }> {
    const paymentDao = new PaymentDao(this.di);
    const userPayments = await paymentDao.getByUserId(userId);
    const currentMonthTs = new Date(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1).getTime();

    const eligiblePayments = userPayments.filter(
      (p) =>
        p.subscriptionStartTimestamp != null &&
        p.subscriptionStartTimestamp > affiliateTimestamp &&
        isFirstAffiliate &&
        p.paymentType !== "refund"
    );

    const userTotalRevenue =
      eligiblePayments.reduce((sum, p) => {
        return sum + this.getDollarAmount(p);
      }, 0) * 0.2;
    const userMonthlyRevenue =
      eligiblePayments
        .filter((p) => p.timestamp >= currentMonthTs)
        .reduce((sum, p) => sum + this.getDollarAmount(p), 0) * 0.2;

    return { userTotalRevenue, userMonthlyRevenue, eligiblePayments };
  }

  private monthKeyFromTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  private generateMonthlyPayments(
    allEligiblePayments: IPaymentDao[],
    affiliateUsers: { affiliateTimestamp: number; affiliateType?: "coupon" | "program" }[]
  ): IAffiliateMonthlyPayment[] {
    const perMonth: Record<string, { revenue: number; count: number; programUsers: number; couponUsers: number }> = {};
    const ensureMonth = (monthKey: string): { revenue: number; count: number; programUsers: number; couponUsers: number } => {
      if (!perMonth[monthKey]) {
        perMonth[monthKey] = { revenue: 0, count: 0, programUsers: 0, couponUsers: 0 };
      }
      return perMonth[monthKey];
    };

    allEligiblePayments.forEach((payment) => {
      const month = ensureMonth(this.monthKeyFromTimestamp(payment.timestamp));
      month.revenue += this.getDollarAmount(payment) * 0.2;
      month.count += 1;
    });

    affiliateUsers.forEach(({ affiliateTimestamp, affiliateType }) => {
      const month = ensureMonth(this.monthKeyFromTimestamp(affiliateTimestamp));
      if (affiliateType === "coupon") {
        month.couponUsers += 1;
      } else {
        month.programUsers += 1;
      }
    });

    const ascending = Object.entries(perMonth)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    let programUsersTotal = 0;
    let couponUsersTotal = 0;
    const withTotals = ascending.map((data) => {
      programUsersTotal += data.programUsers;
      couponUsersTotal += data.couponUsers;
      return { ...data, programUsersTotal, couponUsersTotal };
    });

    return withTotals.sort((a, b) => b.month.localeCompare(a.month));
  }

  public async getDashboardData(affiliateId: string): Promise<{
    affiliateData: IAffiliateData[];
    summary: IAffiliateDashboardSummary;
    monthlyPayments: IAffiliateMonthlyPayment[];
  }> {
    const users = await this.getAffiliatedUsers(affiliateId);

    if (users.length === 0) {
      return {
        affiliateData: [],
        summary: {
          totalUsers: 0,
          paidUsers: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          signedUpUsers: 0,
          programUsers: 0,
          couponUsers: 0,
          programRevenue: 0,
          couponRevenue: 0,
        },
        monthlyPayments: [],
      };
    }

    const logDao = new LogDao(this.di);
    const unsortedAffiliateData: IAffiliateData[] = [];
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let programRevenue = 0;
    let couponRevenue = 0;
    const allEligiblePayments: IPaymentDao[] = [];

    const batchSize = 50;
    const userGroups = CollectionUtils_inGroupsOf(batchSize, users);

    for (const group of userGroups) {
      const groupResults = await Promise.all(
        group.map(async ({ user, userId, affiliateTimestamp, isFirstAffiliate, affiliateType }) => {
          const { userTotalRevenue, userMonthlyRevenue, eligiblePayments } = await this.calculateUserRevenue(
            userId,
            affiliateTimestamp,
            isFirstAffiliate
          );

          allEligiblePayments.push(...eligiblePayments);

          const userLogs = await logDao.getForUsers([userId]);
          const sortedUserLogs = CollectionUtils_sortBy(userLogs, "ts");
          const minTs = sortedUserLogs.length > 0 ? sortedUserLogs[0].ts : affiliateTimestamp;
          const workoutLog = userLogs.find((log) => log.action === "ls-finish-workout");
          const numberOfWorkouts = workoutLog ? workoutLog.cnt : 0;
          const lastWorkoutTs = workoutLog ? workoutLog.ts : 0;
          const maxTs = sortedUserLogs.length > 0 ? sortedUserLogs[sortedUserLogs.length - 1].ts : affiliateTimestamp;
          const daysOfUsing = Math.floor((maxTs - minTs) / (1000 * 60 * 60 * 24));

          const isPaid = eligiblePayments.length > 0;
          const hasActiveSubscription = !!(
            user?.storage?.subscription?.key ||
            (user?.storage?.subscription?.apple && user.storage.subscription.apple.length > 0) ||
            (user?.storage?.subscription?.google && user.storage.subscription.google.length > 0)
          );

          return {
            userTotalRevenue,
            userMonthlyRevenue,
            affiliateType,
            affiliateData: {
              userId: userId,
              affiliateTimestamp,
              numberOfWorkouts,
              lastWorkoutTs,
              daysOfUsing,
              isPaid,
              hasActiveSubscription,
              isSignedUp: user != null,
              isFirstAffiliate,
              userTotalRevenue: userTotalRevenue,
              userMonthlyRevenue: userMonthlyRevenue,
              paymentsCount: eligiblePayments.length,
              affiliateType,
            },
          };
        })
      );

      for (const { userTotalRevenue, userMonthlyRevenue, affiliateData, affiliateType } of groupResults) {
        totalRevenue += userTotalRevenue;
        monthlyRevenue += userMonthlyRevenue;
        if (affiliateType === "program") {
          programRevenue += userTotalRevenue;
        } else if (affiliateType === "coupon") {
          couponRevenue += userTotalRevenue;
        }
        unsortedAffiliateData.push(affiliateData);
      }
    }

    const affiliateData = CollectionUtils_sortByMultiple(unsortedAffiliateData, ["isPaid", "affiliateTimestamp"], true);
    const isFirstAffiliateUsers = users.filter(({ isFirstAffiliate }) => isFirstAffiliate);
    const signedUpUsersCount = isFirstAffiliateUsers.filter(({ user }) => user != null).length;
    const paidUsers = affiliateData.filter((d) => d.isFirstAffiliate && d.isPaid).length;
    const programUsers = isFirstAffiliateUsers.filter(({ affiliateType }) => affiliateType === "program").length;
    const couponUsers = isFirstAffiliateUsers.filter(({ affiliateType }) => affiliateType === "coupon").length;

    const summary = {
      totalUsers: isFirstAffiliateUsers.length,
      signedUpUsers: signedUpUsersCount,
      paidUsers,
      totalRevenue: totalRevenue,
      monthlyRevenue: monthlyRevenue,
      programUsers,
      couponUsers,
      programRevenue,
      couponRevenue,
    };

    const monthlyPayments = this.generateMonthlyPayments(allEligiblePayments, isFirstAffiliateUsers);

    return { affiliateData, summary, monthlyPayments };
  }

  public async getCreatorStats(creatorId: string): Promise<{
    summary: IAffiliateDashboardSummary;
    monthlyPayments: IAffiliateMonthlyPayment[];
  }> {
    const users = await this.getAffiliatedUsers(creatorId);

    if (users.length === 0) {
      return {
        summary: {
          totalUsers: 0,
          signedUpUsers: 0,
          paidUsers: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          programUsers: 0,
          couponUsers: 0,
          programRevenue: 0,
          couponRevenue: 0,
        },
        monthlyPayments: [],
      };
    }

    const firstAffiliateUsers = users.filter(({ isFirstAffiliate }) => isFirstAffiliate);
    const signedUpUsersCount = firstAffiliateUsers.filter(({ user }) => user != null).length;
    const programUsers = firstAffiliateUsers.filter(({ affiliateType }) => affiliateType === "program").length;
    const couponUsers = firstAffiliateUsers.filter(({ affiliateType }) => affiliateType === "coupon").length;

    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let programRevenue = 0;
    let couponRevenue = 0;
    let paidUsersCount = 0;
    const allEligiblePayments: IPaymentDao[] = [];

    const batchSize = 20;
    const userGroups = CollectionUtils_inGroupsOf(batchSize, firstAffiliateUsers);

    for (const group of userGroups) {
      const groupResults = await Promise.all(
        group.map(async ({ userId, affiliateTimestamp, isFirstAffiliate, affiliateType }) => {
          const revenue = await this.calculateUserRevenue(userId, affiliateTimestamp, isFirstAffiliate);
          return { ...revenue, affiliateType };
        })
      );

      for (const { userTotalRevenue, userMonthlyRevenue, eligiblePayments, affiliateType } of groupResults) {
        if (eligiblePayments.length > 0) {
          paidUsersCount += 1;
        }
        totalRevenue += userTotalRevenue;
        monthlyRevenue += userMonthlyRevenue;
        if (affiliateType === "program") {
          programRevenue += userTotalRevenue;
        } else if (affiliateType === "coupon") {
          couponRevenue += userTotalRevenue;
        }
        allEligiblePayments.push(...eligiblePayments);
      }
    }

    const monthlyPayments = this.generateMonthlyPayments(allEligiblePayments, firstAffiliateUsers);

    return {
      summary: {
        totalUsers: firstAffiliateUsers.length,
        signedUpUsers: signedUpUsersCount,
        paidUsers: paidUsersCount,
        totalRevenue: totalRevenue,
        monthlyRevenue: monthlyRevenue,
        programUsers,
        couponUsers,
        programRevenue,
        couponRevenue,
      },
      monthlyPayments,
    };
  }
}
