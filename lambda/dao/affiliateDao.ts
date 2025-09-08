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
  },
  prod: {
    affiliates: "lftAffiliates",
  },
} as const;

export interface IAffiliateDao {
  affiliateId: string;
  userId: string;
}

export interface IAffiliateDashboardSummary {
  totalUsers: number;
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

  public async put(items: { affiliateId: string; userId: string }[]): Promise<void> {
    if (items.length === 0) {
      return;
    }
    const env = Utils.getEnv();
    await this.di.dynamo.batchPut({ tableName: tableNames[env].affiliates, items });
  }

  private async getAffiliatedUsers(affiliateId: string): Promise<{
    users: Array<{ user: ILimitedUserDao; affiliateTimestamp: number; isFirstAffiliate: boolean }>;
    currentMonthTs: number;
  }> {
    // Get user IDs affiliated with this creator from the affiliates table
    const affiliatedUserIds = await this.getUserIds(affiliateId);

    if (affiliatedUserIds.length === 0) {
      return { users: [], currentMonthTs: 0 };
    }

    const userDao = new UserDao(this.di);
    const affiliatedUsers = await userDao.getLimitedByIds(affiliatedUserIds);

    // Get current month timestamp for filtering
    const currentMonth = new Date();
    currentMonth.setUTCHours(0, 0, 0, 0);
    currentMonth.setUTCDate(1);
    const currentMonthTs = currentMonth.getTime();

    const users = affiliatedUsers.map((user) => {
      const affiliates = user.storage?.affiliates || {};
      const affiliateTimestamp = affiliates[affiliateId] || 0;

      // Check if this creator is the first affiliate (lowest timestamp)
      const sortedAffiliates = Object.entries(affiliates).sort((a, b) => (a[1] || 0) - (b[1] || 0));
      const isFirstAffiliate = sortedAffiliates.length === 0 || sortedAffiliates[0][0] === affiliateId;

      return { user, affiliateTimestamp, isFirstAffiliate };
    });

    return { users, currentMonthTs };
  }

  private async calculateUserRevenue(
    user: ILimitedUserDao,
    affiliateTimestamp: number,
    isFirstAffiliate: boolean,
    currentMonthTs: number
  ): Promise<{ userTotalRevenue: number; userMonthlyRevenue: number; eligiblePayments: IPaymentDao[] }> {
    const paymentDao = new PaymentDao(this.di);
    const userPayments = await paymentDao.getByUserId(user.id);

    // Only count payments made AFTER the affiliate timestamp and if they're the first affiliate
    const eligiblePayments = userPayments.filter(
      (p) => p.timestamp > affiliateTimestamp && isFirstAffiliate && p.paymentType !== "refund"
    );

    // Calculate revenue (20% share)
    const userTotalRevenue = eligiblePayments.reduce((sum, p) => sum + (p.amount || 0), 0) * 0.2;
    const userMonthlyRevenue =
      eligiblePayments.filter((p) => p.timestamp >= currentMonthTs).reduce((sum, p) => sum + (p.amount || 0), 0) * 0.2;

    return { userTotalRevenue, userMonthlyRevenue, eligiblePayments };
  }

  public async getDashboardData(affiliateId: string): Promise<{
    affiliateData: IAffiliateData[];
    summary: IAffiliateDashboardSummary;
  }> {
    const { users, currentMonthTs } = await this.getAffiliatedUsers(affiliateId);

    if (users.length === 0) {
      return {
        affiliateData: [],
        summary: {
          totalUsers: 0,
          paidUsers: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
        },
      };
    }

    const logDao = new LogDao(this.di);
    const unsortedAffiliateData: IAffiliateData[] = [];
    let totalRevenue = 0;
    let monthlyRevenue = 0;

    // Process users in batches to avoid overwhelming the database
    const batchSize = 20;
    const userGroups = CollectionUtils.inGroupsOf(batchSize, users);

    for (const group of userGroups) {
      // Process each group concurrently (payments + logs)
      const groupResults = await Promise.all(
        group.map(async ({ user, affiliateTimestamp, isFirstAffiliate }) => {
          // Get payment data
          const { userTotalRevenue, userMonthlyRevenue, eligiblePayments } = await this.calculateUserRevenue(
            user,
            affiliateTimestamp,
            isFirstAffiliate,
            currentMonthTs
          );

          // Get log data for workout statistics (only for admin dashboard)
          const userLogs = await logDao.getForUsers([user.id]);
          const sortedUserLogs = CollectionUtils.sortBy(userLogs, "ts");
          const minTs = sortedUserLogs.length > 0 ? sortedUserLogs[0].ts : affiliateTimestamp;
          const workoutLog = userLogs.find((log) => log.action === "ls-finish-workout");
          const numberOfWorkouts = workoutLog ? workoutLog.cnt : 0;
          const lastWorkoutTs = workoutLog ? workoutLog.ts : 0;
          const maxTs = sortedUserLogs.length > 0 ? sortedUserLogs[sortedUserLogs.length - 1].ts : affiliateTimestamp;
          const daysOfUsing = Math.floor((maxTs - minTs) / (1000 * 60 * 60 * 24));

          const isPaid = eligiblePayments.length > 0;
          // Check if user has any subscription data (simplified check - doesn't verify if active)
          const hasActiveSubscription = !!(
            user.storage?.subscription?.key ||
            (user.storage?.subscription?.apple && user.storage.subscription.apple.length > 0) ||
            (user.storage?.subscription?.google && user.storage.subscription.google.length > 0)
          );

          return {
            userTotalRevenue,
            userMonthlyRevenue,
            affiliateData: {
              userId: user.id,
              affiliateTimestamp,
              importDate: new Date(affiliateTimestamp).toISOString(),
              numberOfWorkouts,
              lastWorkoutTs,
              daysOfUsing,
              isPaid,
              hasActiveSubscription,
              isFirstAffiliate,
              userTotalRevenue: userTotalRevenue,
              userMonthlyRevenue: userMonthlyRevenue,
              paymentsCount: eligiblePayments.length,
            },
          };
        })
      );

      // Aggregate results from this batch
      for (const { userTotalRevenue, userMonthlyRevenue, affiliateData } of groupResults) {
        totalRevenue += userTotalRevenue;
        monthlyRevenue += userMonthlyRevenue;
        unsortedAffiliateData.push(affiliateData);
      }
    }

    // Sort by isPaid (paid users first) then by affiliateTimestamp (most recent first)
    const affiliateData = CollectionUtils.sortByMultiple(unsortedAffiliateData, ["isPaid", "affiliateTimestamp"], true);

    // Add summary data
    const summary = {
      totalUsers: affiliateData.length,
      paidUsers: affiliateData.filter((d) => d.isPaid).length,
      totalRevenue: totalRevenue,
      monthlyRevenue: monthlyRevenue,
    };

    return { affiliateData, summary };
  }

  public async getCreatorStats(creatorId: string): Promise<IAffiliateDashboardSummary> {
    // Optimized version that doesn't fetch logs or detailed user data
    const { users, currentMonthTs } = await this.getAffiliatedUsers(creatorId);

    if (users.length === 0) {
      return {
        totalUsers: 0,
        paidUsers: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
      };
    }

    // Filter to only first affiliates before processing payments
    const firstAffiliateUsers = users.filter(({ isFirstAffiliate }) => isFirstAffiliate);

    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let paidUsersCount = 0;

    // Process payments in batches to avoid overwhelming the database
    const batchSize = 20;
    const userGroups = CollectionUtils.inGroupsOf(batchSize, firstAffiliateUsers);

    for (const group of userGroups) {
      // Process each group concurrently
      const groupResults = await Promise.all(
        group.map(async ({ user, affiliateTimestamp, isFirstAffiliate }) => {
          return this.calculateUserRevenue(user, affiliateTimestamp, isFirstAffiliate, currentMonthTs);
        })
      );

      // Aggregate results from this batch
      for (const { userTotalRevenue, userMonthlyRevenue, eligiblePayments } of groupResults) {
        if (eligiblePayments.length > 0) {
          paidUsersCount += 1;
        }
        totalRevenue += userTotalRevenue;
        monthlyRevenue += userMonthlyRevenue;
      }
    }

    return {
      totalUsers: users.length,
      paidUsers: paidUsersCount,
      totalRevenue: totalRevenue, // Convert from cents to dollars
      monthlyRevenue: monthlyRevenue,
    };
  }
}
