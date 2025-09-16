import { Utils } from "../utils";
import { IDI } from "../utils/di";
import { ILimitedUserDao, UserDao } from "./userDao";
import { IPaymentDao, PaymentDao } from "./paymentDao";
import { LogDao } from "./logDao";
import { CollectionUtils } from "../../src/utils/collection";
import { IAffiliateData } from "../../src/pages/affiliateDashboard/affiliateDashboardContent";

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
}

export interface IAffiliateDashboardSummary {
  totalUsers: number;
  signedUpUsers: number;
  paidUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
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

  public async getAffiliatesForUser(userId: string): Promise<IAffiliateDao[]> {
    const env = Utils.getEnv();
    const result = await this.di.dynamo.query<IAffiliateDao>({
      tableName: tableNames[env].affiliates,
      indexName: tableNames[env].affiliatesUserIdIndex,
      expression: "userId = :userId",
      values: { ":userId": userId },
    });
    return result;
  }

  public async getAffiliatesForUsers(allUserIds: string[]): Promise<Partial<Record<string, IAffiliateDao[]>>> {
    const groups = CollectionUtils.inGroupsOf(50, allUserIds);
    const env = Utils.getEnv();
    const allResults: IAffiliateDao[] = [];

    for (const group of groups) {
      const groupResults = await Promise.all(
        group.map(async (userId) => {
          return await this.di.dynamo.query<IAffiliateDao>({
            tableName: tableNames[env].affiliates,
            indexName: tableNames[env].affiliatesUserIdIndex,
            expression: "userId = :userId",
            values: { ":userId": userId },
          });
        })
      );
      allResults.push(...groupResults.flat());
    }

    return CollectionUtils.groupByKey(allResults, "userId");
  }

  public async put(items: { affiliateId: string; userId: string }[]): Promise<void> {
    if (items.length === 0) {
      return;
    }
    const env = Utils.getEnv();
    await this.di.dynamo.batchPut({ tableName: tableNames[env].affiliates, items });
  }

  public async putIfNotExists(items: { affiliateId: string; userId: string; timestamp?: number }[]): Promise<void> {
    if (items.length === 0) {
      return;
    }
    const env = Utils.getEnv();

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

  private async getAffiliatedUsers(
    affiliateId: string
  ): Promise<Array<{ userId: string; user?: ILimitedUserDao; affiliateTimestamp: number; isFirstAffiliate: boolean }>> {
    const affiliatedUserIds = await this.getUserIds(affiliateId);

    if (affiliatedUserIds.length === 0) {
      return [];
    }

    const userDao = new UserDao(this.di);
    const affiliatedUsers = await userDao.getLimitedByIds(affiliatedUserIds);
    const restUserIds = affiliatedUserIds.filter((userId) => !affiliatedUsers.some((user) => user.id === userId));
    const userIdToAffiliates = await this.getAffiliatesForUsers(restUserIds);
    const idToAffiliatedUser = CollectionUtils.groupByKeyUniq(affiliatedUsers, "id");

    const users = affiliatedUserIds.map((userId) => {
      const user = idToAffiliatedUser[userId];
      if (user) {
        const affiliates = user.storage?.affiliates || {};
        const affiliateTimestamp = affiliates[affiliateId] || 0;

        const sortedAffiliates = Object.entries(affiliates).sort((a, b) => (a[1] || 0) - (b[1] || 0));
        const isFirstAffiliate = sortedAffiliates.length === 0 || sortedAffiliates[0][0] === affiliateId;

        return { userId, user, affiliateTimestamp, isFirstAffiliate };
      } else {
        const affiliates = userIdToAffiliates[userId] || [];
        const sortedAffiliates = CollectionUtils.sortByExpr(affiliates, (e) => e.timestamp || 0);
        const affiliateTimestamp = sortedAffiliates.find((a) => a.affiliateId === affiliateId)?.timestamp || 0;
        const isFirstAffiliate = sortedAffiliates.length > 0 && sortedAffiliates[0].affiliateId === affiliateId;
        return { userId, user: undefined, affiliateTimestamp, isFirstAffiliate };
      }
    });

    return users;
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

    const userTotalRevenue = eligiblePayments.reduce((sum, p) => sum + (p.amount || 0), 0) * 0.2;
    const userMonthlyRevenue =
      eligiblePayments.filter((p) => p.timestamp >= currentMonthTs).reduce((sum, p) => sum + (p.amount || 0), 0) * 0.2;

    return { userTotalRevenue, userMonthlyRevenue, eligiblePayments };
  }

  private generateMonthlyPayments(
    allEligiblePayments: IPaymentDao[]
  ): { month: string; revenue: number; count: number }[] {
    const paymentsPerMonth: Record<string, { revenue: number; count: number }> = {};

    allEligiblePayments.forEach((payment) => {
      const date = new Date(payment.timestamp);
      const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      if (!paymentsPerMonth[monthKey]) {
        paymentsPerMonth[monthKey] = { revenue: 0, count: 0 };
      }
      paymentsPerMonth[monthKey].revenue += (payment.amount || 0) * 0.2;
      paymentsPerMonth[monthKey].count += 1;
    });

    return Object.entries(paymentsPerMonth)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }

  public async getDashboardData(affiliateId: string): Promise<{
    affiliateData: IAffiliateData[];
    summary: IAffiliateDashboardSummary;
    monthlyPayments: { month: string; revenue: number; count: number }[];
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
        },
        monthlyPayments: [],
      };
    }

    const logDao = new LogDao(this.di);
    const unsortedAffiliateData: IAffiliateData[] = [];
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    const allEligiblePayments: IPaymentDao[] = [];

    const batchSize = 50;
    const userGroups = CollectionUtils.inGroupsOf(batchSize, users);

    for (const group of userGroups) {
      const groupResults = await Promise.all(
        group.map(async ({ user, userId, affiliateTimestamp, isFirstAffiliate }) => {
          const { userTotalRevenue, userMonthlyRevenue, eligiblePayments } = await this.calculateUserRevenue(
            userId,
            affiliateTimestamp,
            isFirstAffiliate
          );

          allEligiblePayments.push(...eligiblePayments);

          const userLogs = await logDao.getForUsers([userId]);
          const sortedUserLogs = CollectionUtils.sortBy(userLogs, "ts");
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
            },
          };
        })
      );

      for (const { userTotalRevenue, userMonthlyRevenue, affiliateData } of groupResults) {
        totalRevenue += userTotalRevenue;
        monthlyRevenue += userMonthlyRevenue;
        unsortedAffiliateData.push(affiliateData);
      }
    }

    const affiliateData = CollectionUtils.sortByMultiple(unsortedAffiliateData, ["isPaid", "affiliateTimestamp"], true);
    const isFirstAffiliateUsers = users.filter(({ isFirstAffiliate }) => isFirstAffiliate);
    const signedUpUsersCount = isFirstAffiliateUsers.filter(({ user }) => user != null).length;
    const paidUsers = affiliateData.filter((d) => d.isFirstAffiliate && d.isPaid).length;

    const summary = {
      totalUsers: isFirstAffiliateUsers.length,
      signedUpUsers: signedUpUsersCount,
      paidUsers,
      totalRevenue: totalRevenue,
      monthlyRevenue: monthlyRevenue,
    };

    const monthlyPayments = this.generateMonthlyPayments(allEligiblePayments);

    return { affiliateData, summary, monthlyPayments };
  }

  public async getCreatorStats(creatorId: string): Promise<{
    summary: IAffiliateDashboardSummary;
    monthlyPayments: { month: string; revenue: number; count: number }[];
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
        },
        monthlyPayments: [],
      };
    }

    const firstAffiliateUsers = users.filter(({ isFirstAffiliate }) => isFirstAffiliate);
    const signedUpUsersCount = firstAffiliateUsers.filter(({ user }) => user != null).length;

    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let paidUsersCount = 0;
    const allEligiblePayments: IPaymentDao[] = [];

    const batchSize = 20;
    const userGroups = CollectionUtils.inGroupsOf(batchSize, firstAffiliateUsers);

    for (const group of userGroups) {
      const groupResults = await Promise.all(
        group.map(async ({ userId, affiliateTimestamp, isFirstAffiliate }) => {
          return this.calculateUserRevenue(userId, affiliateTimestamp, isFirstAffiliate);
        })
      );

      for (const { userTotalRevenue, userMonthlyRevenue, eligiblePayments } of groupResults) {
        if (eligiblePayments.length > 0) {
          paidUsersCount += 1;
        }
        totalRevenue += userTotalRevenue;
        monthlyRevenue += userMonthlyRevenue;
        allEligiblePayments.push(...eligiblePayments);
      }
    }

    const monthlyPayments = this.generateMonthlyPayments(allEligiblePayments);

    return {
      summary: {
        totalUsers: firstAffiliateUsers.length,
        signedUpUsers: signedUpUsersCount,
        paidUsers: paidUsersCount,
        totalRevenue: totalRevenue,
        monthlyRevenue: monthlyRevenue,
      },
      monthlyPayments,
    };
  }
}
