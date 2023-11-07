import {
  IStorage,
  IHistoryRecord,
  IProgram,
  IWeight,
  ILength,
  IStats,
  IPartialStorage,
  IPercentage,
} from "../../src/types";
import { Settings } from "../../src/models/settings";
import { Utils } from "../utils";
import { CollectionUtils } from "../../src/utils/collection";
import { ObjectUtils } from "../../src/utils/object";
import { IDI } from "../utils/di";
import { getLatestMigrationVersion } from "../../src/migrations/migrations";
import { freeUsersTableNames } from "./freeUserDao";
import { LogDao, logTableNames } from "./logDao";
import { subscriptionDetailsTableNames } from "./subscriptionDetailsDao";

export const userTableNames = {
  dev: {
    users: "lftUsersDev",
    usersGoogleId: "lftUsersGoogleIdDev",
    usersAppleId: "lftUsersAppleIdDev",
    usersNickname: "lftUsersNicknameDev",
    historyRecords: "lftHistoryRecordsDev",
    historyRecordsDate: "lftHistoryRecordsDateDev",
    stats: "lftStatsDev",
    programs: "lftUserProgramsDev",
  },
  prod: {
    users: "lftUsers",
    usersGoogleId: "lftUsersGoogleId",
    usersAppleId: "lftUsersAppleId",
    usersNickname: "lftUsersNickname",
    historyRecords: "lftHistoryRecords",
    historyRecordsDate: "lftHistoryRecordsDate",
    stats: "lftStats",
    programs: "lftUserPrograms",
  },
} as const;

export type IUserDao = {
  id: string;
  email: string;
  createdAt: number;
  googleId?: string;
  appleId?: string;
  storage: IStorage;
  nickname?: string;
};

export type ILimitedUserDao = Omit<IUserDao, "storage"> & {
  storage: Omit<IUserDao["storage"], "programs" | "history" | "stats">;
};

export type IFriendUserDao = Pick<IUserDao, "id" | "nickname"> & {
  storage: Omit<IUserDao["storage"], "programs" | "stats">;
};

interface IStatDb {
  name: string;
  value: IWeight | ILength | IPercentage;
  timestamp: number;
  type: "length" | "weight" | "percentage";
}

export class UserDao {
  constructor(private readonly di: IDI) {}

  public async getByGoogleId(googleId: string): Promise<IUserDao | undefined> {
    const env = Utils.getEnv();

    const items = await this.di.dynamo.query<IUserDao>({
      tableName: userTableNames[env].users,
      indexName: userTableNames[env].usersGoogleId,
      expression: "#googleId = :googleId",
      attrs: { "#googleId": "googleId" },
      values: { ":googleId": googleId },
    });

    const id: string | undefined = items?.[0]?.id;
    if (id != null) {
      return this.getById(id);
    } else {
      return undefined;
    }
  }

  public async getByAppleId(appleId: string): Promise<IUserDao | undefined> {
    const env = Utils.getEnv();

    const items = await this.di.dynamo.query<IUserDao>({
      tableName: userTableNames[env].users,
      indexName: userTableNames[env].usersAppleId,
      expression: "#appleId = :appleId",
      attrs: { "#appleId": "appleId" },
      values: { ":appleId": appleId },
    });

    const id: string | undefined = items?.[0]?.id;
    if (id != null) {
      return this.getById(id);
    } else {
      return undefined;
    }
  }

  public static build(id: string, email: string, opts: { appleId?: string; googleId?: string }): IUserDao {
    return {
      id,
      email,
      googleId: opts.googleId,
      appleId: opts.appleId,
      createdAt: Date.now(),
      storage: {
        affiliates: {},
        signupRequests: [],
        reviewRequests: [],
        history: [],
        programs: [],
        stats: { weight: {}, length: {}, percentage: {} },
        id: 1,
        currentProgramId: undefined,
        version: getLatestMigrationVersion(),
        helps: [],
        tempUserId: "",
        settings: Settings.build(),
        subscription: { apple: {}, google: {} },
        email: undefined,
        whatsNew: undefined,
      },
    };
  }

  public async store(user: ILimitedUserDao): Promise<void> {
    const env = Utils.getEnv();
    const item = { ...user, nickname: user.storage.settings.nickname?.toLowerCase() };
    await this.di.dynamo.put({ tableName: userTableNames[env].users, item });
  }

  public async getLimitedById(userId: string): Promise<ILimitedUserDao | undefined> {
    const env = Utils.getEnv();
    return this.di.dynamo.get<ILimitedUserDao>({
      tableName: userTableNames[env].users,
      key: { id: userId },
    });
  }

  public async getLimitedByIds(userIds: string[]): Promise<ILimitedUserDao[]> {
    const env = Utils.getEnv();
    return this.di.dynamo.batchGet<ILimitedUserDao>({
      tableName: userTableNames[env].users,
      keys: userIds.map((ui) => ({ id: ui })),
    });
  }

  public async getUserAndHistory(
    currentUserId: string,
    startDate: string,
    endDate?: string
  ): Promise<(Omit<IUserDao, "storage"> & { storage: Omit<IUserDao["storage"], "programs" | "stats"> }) | undefined> {
    const env = Utils.getEnv();
    const [user, history] = await Promise.all([
      this.getLimitedById(currentUserId),
      this.di.dynamo.query<IHistoryRecord>({
        tableName: userTableNames[env].historyRecords,
        indexName: userTableNames[env].historyRecordsDate,
        expression: `userId = :userId AND ${endDate ? "#date BETWEEN :startDate AND :endDate" : "#date > :startDate"}`,
        attrs: { "#date": "date" },
        scanIndexForward: false,
        values: { ":userId": currentUserId, ":startDate": startDate, ":endDate": endDate },
      }),
    ]);
    if (user) {
      return { ...user, storage: { ...user.storage, history } };
    } else {
      return undefined;
    }
  }

  public getHistoryByUserId(userId: string): Promise<IHistoryRecord[]> {
    const env = Utils.getEnv();
    return this.di.dynamo.query<IHistoryRecord>({
      tableName: userTableNames[env].historyRecords,
      indexName: userTableNames[env].historyRecordsDate,
      expression: "#userId = :userId",
      scanIndexForward: false,
      attrs: { "#userId": "userId" },
      values: { ":userId": userId },
    });
  }

  public async getStatsByUserId(userId: string): Promise<IStats> {
    const env = Utils.getEnv();
    const statsDb = await this.di.dynamo.query<IStatDb>({
      tableName: userTableNames[env].stats,
      expression: "#userId = :userId",
      scanIndexForward: false,
      attrs: { "#userId": "userId" },
      values: { ":userId": userId },
    });
    return convertStatsFromDb(statsDb);
  }

  public getProgramsByUserId(userId: string): Promise<IProgram[]> {
    const env = Utils.getEnv();
    return this.di.dynamo.query<IProgram>({
      tableName: userTableNames[env].programs,
      expression: "#userId = :userId",
      attrs: { "#userId": "userId" },
      values: { ":userId": userId },
    });
  }

  public async getProgramsByUserIds(userIds: string[]): Promise<(IProgram & { userId: string })[]> {
    const env = Utils.getEnv();
    const groupedUserIdValues = CollectionUtils.inGroupsOf(100, userIds);
    const result = await Promise.all(
      groupedUserIdValues.map((group) => {
        const userIdValues = Object.fromEntries(group.map((value, idx) => [`:val${idx}`, value]));
        return this.di.dynamo.scan<IProgram & { userId: string }>({
          tableName: userTableNames[env].programs,
          filterExpression: `userId IN (${Object.keys(userIdValues).join(", ")})`,
          values: userIdValues,
        });
      })
    );
    return result.flat();
  }

  public async removeUser(userId: string): Promise<void> {
    const env = Utils.getEnv();
    const programs = await this.getProgramsByUserId(userId);
    const programIds = Array.from(new Set(programs.map((p) => p.id)));
    if (programIds.length > 0) {
      await this.di.dynamo.batchDelete({
        tableName: userTableNames[env].programs,
        keys: programIds.map((id) => ({ id, userId })),
      });
    }

    const statsDb = await this.di.dynamo.query<IStatDb>({
      tableName: userTableNames[env].stats,
      expression: "#userId = :userId",
      scanIndexForward: false,
      attrs: { "#userId": "userId" },
      values: { ":userId": userId },
    });
    const names = Array.from(new Set(statsDb.map((p) => p.name)));
    if (names.length > 0) {
      await this.di.dynamo.batchDelete({
        tableName: userTableNames[env].stats,
        keys: names.map((name) => ({ name, userId })),
      });
    }

    const historyRecords = await this.getHistoryByUserId(userId);
    const historyRecordIds = Array.from(new Set(historyRecords.map((p) => p.id)));
    if (historyRecordIds.length > 0) {
      await this.di.dynamo.batchDelete({
        tableName: userTableNames[env].historyRecords,
        keys: historyRecordIds.map((id) => ({ id, userId })),
      });
    }

    await this.di.dynamo.remove({ tableName: userTableNames[env].users, key: { id: userId } });
    await this.di.dynamo.remove({ tableName: freeUsersTableNames[env].freeUsers, key: { id: userId } });
    await this.di.dynamo.remove({
      tableName: subscriptionDetailsTableNames[env].subscriptionDetails,
      key: { userId },
    });

    const logDao = new LogDao(this.di);
    const logs = await logDao.getForUsers([userId]);
    const actions = logs.map((l) => l.action);
    if (actions.length > 0) {
      await this.di.dynamo.batchDelete({
        tableName: logTableNames[env].logs,
        keys: actions.map((action) => ({ action, userId })),
      });
    }
  }

  public async getById(userId: string): Promise<IUserDao | undefined> {
    const userDao = await this.getLimitedById(userId);
    if (userDao != null) {
      const history = await this.getHistoryByUserId(userId);
      const programs = await this.getProgramsByUserId(userId);
      const stats = await this.getStatsByUserId(userId);

      return { ...userDao, storage: { ...userDao.storage, history, programs, stats } };
    } else {
      return undefined;
    }
  }

  public async saveStorage(user: ILimitedUserDao, storage: IPartialStorage): Promise<void> {
    const { history, programs, stats, ...userStorage } = storage;
    const statsObj = stats || { length: {}, weight: {}, percentage: {} };
    const env = Utils.getEnv();
    const updatedUser: ILimitedUserDao = { ...user, storage: userStorage };

    let historyDeletes: Promise<void>[] = [];
    let historyUpdates: Promise<void>[] = [];
    if (history) {
      const userHistory = await this.getHistoryByUserId(user.id);
      const newHistoryIds = CollectionUtils.collectToSet(history || [], "id");
      const historyToDelete = userHistory.filter((r) => !newHistoryIds.has(r.id));

      historyDeletes = CollectionUtils.inGroupsOf(23, historyToDelete).map(async (group) => {
        await this.di.dynamo.batchDelete({
          tableName: userTableNames[env].historyRecords,
          keys: group.map((record) => ({ id: record.id, userId: user.id })),
        });
      });

      historyUpdates = CollectionUtils.inGroupsOf(23, history).map(async (group) => {
        const items = CollectionUtils.uniqBy(group, "id").map((record) => ({ ...record, userId: user.id }));
        await this.di.dynamo.batchPut({ tableName: userTableNames[env].historyRecords, items });
      });
    }

    let programDeletes: Promise<void>[] = [];
    let programUpdates: Promise<void>[] = [];
    if (programs) {
      const userPrograms = await this.getProgramsByUserId(user.id);
      const newProgramIds = CollectionUtils.collectToSet(programs || [], "id");
      const programsToDelete = userPrograms.filter((r) => !newProgramIds.has(r.id));
      programDeletes = CollectionUtils.inGroupsOf(23, programsToDelete).map(async (group) => {
        await this.di.dynamo.batchDelete({
          tableName: userTableNames[env].programs,
          keys: group.map((record) => ({ id: record.id, userId: user.id })),
        });
      });

      programUpdates = CollectionUtils.inGroupsOf(23, programs).map(async (group) => {
        await this.di.dynamo.batchPut({
          tableName: userTableNames[env].programs,
          items: group.map((record) => ({ ...record, userId: user.id })),
        });
      });
    }

    let statsDeletes: Promise<void>[] = [];
    let statsUpdates: Promise<void>[] = [];
    if (stats) {
      const userStats = await this.getStatsByUserId(user.id);
      const newStatNames = new Set<string>();
      for (const k of ObjectUtils.keys(statsObj.length)) {
        const s = statsObj.length[k];
        for (const v of s || []) {
          newStatNames.add(`${v.timestamp}_${k}`);
        }
      }
      for (const k of ObjectUtils.keys(statsObj.weight)) {
        const s = statsObj.weight[k];
        for (const v of s || []) {
          newStatNames.add(`${v.timestamp}_${k}`);
        }
      }
      for (const k of ObjectUtils.keys(statsObj.percentage)) {
        const s = statsObj.percentage[k];
        for (const v of s || []) {
          newStatNames.add(`${v.timestamp}_${k}`);
        }
      }
      const statsToDelete = [];
      for (const k of ObjectUtils.keys(userStats.weight)) {
        const s = userStats.weight[k];
        for (const v of s || []) {
          const name = `${v.timestamp}_${k}`;
          if (!newStatNames.has(name)) {
            statsToDelete.push(name);
          }
        }
      }
      for (const k of ObjectUtils.keys(userStats.length)) {
        const s = userStats.length[k];
        for (const v of s || []) {
          const name = `${v.timestamp}_${k}`;
          if (!newStatNames.has(name)) {
            statsToDelete.push(name);
          }
        }
      }
      for (const k of ObjectUtils.keys(userStats.percentage)) {
        const s = userStats.percentage[k];
        for (const v of s || []) {
          const name = `${v.timestamp}_${k}`;
          if (!newStatNames.has(name)) {
            statsToDelete.push(name);
          }
        }
      }
      statsDeletes = CollectionUtils.inGroupsOf(23, statsToDelete).map(async (group) => {
        await this.di.dynamo.batchDelete({
          tableName: userTableNames[env].stats,
          keys: group.map((record) => ({ userId: user.id, name: record })),
        });
      });

      const statsLengthArray: IStatDb[] = ObjectUtils.keys(statsObj.length).flatMap((key) => {
        const st = statsObj.length[key] || [];
        return st.map((s) => ({ ...s, name: `${s.timestamp}_${key}`, type: "length" }));
      });
      const statsWeightArray: IStatDb[] = ObjectUtils.keys(statsObj.weight).flatMap((key) => {
        const st = statsObj.weight[key] || [];
        return st.map((s) => ({ ...s, name: `${s.timestamp}_${key}`, type: "weight" }));
      });
      const statsPercentageArray: IStatDb[] = ObjectUtils.keys(statsObj.percentage).flatMap((key) => {
        const st = statsObj.percentage[key] || [];
        return st.map((s) => ({ ...s, name: `${s.timestamp}_${key}`, type: "percentage" }));
      });
      const statsArray = statsLengthArray.concat(statsWeightArray).concat(statsPercentageArray);
      statsUpdates = CollectionUtils.inGroupsOf(23, statsArray).map(async (group) => {
        await this.di.dynamo.batchPut({
          tableName: userTableNames[env].stats,
          items: group.map((record) => ({ ...record, userId: user.id })),
        });
      });
    }

    await Promise.all([
      this.store(updatedUser),
      ...historyUpdates,
      ...historyDeletes,
      ...programUpdates,
      ...programDeletes,
      ...statsUpdates,
      ...statsDeletes,
    ]);
  }

  public async getAllLimited(): Promise<ILimitedUserDao[]> {
    const env = Utils.getEnv();
    return this.di.dynamo.scan({ tableName: userTableNames[env].users });
  }

  public async getAll(): Promise<IUserDao[]> {
    const env = Utils.getEnv();
    const allUsers = await this.getAllLimited();

    const allHistory = await this.di.dynamo
      .scan<IHistoryRecord & { userId: string }>({ tableName: userTableNames[env].historyRecords })
      .then((r) => r.sort((a, b) => new Date(Date.parse(b.date)).getTime() - new Date(Date.parse(a.date)).getTime()));
    const allPrograms = await this.di.dynamo.scan<IProgram & { userId: string }>({
      tableName: userTableNames[env].programs,
    });
    const allStatsDbs = await this.di.dynamo.scan<IStatDb & { userId: string }>({
      tableName: userTableNames[env].stats,
    });

    const allStatsDbsByUser = CollectionUtils.groupByKey(allStatsDbs, "userId");

    return allUsers.map<IUserDao>((user) => {
      const statsDb = allStatsDbsByUser[user.id];
      return {
        ...user,
        storage: {
          ...user.storage,
          history: allHistory.filter((r) => r.userId === user.id),
          programs: allPrograms.filter((r) => r.userId === user.id),
          stats: statsDb ? convertStatsFromDb(statsDb) : { weight: {}, length: {}, percentage: {} },
        },
      };
    });
  }
}

function convertStatsFromDb(statsDb: IStatDb[]): IStats {
  return statsDb.reduce<{
    weight: Partial<Record<string, unknown[]>>;
    length: Partial<Record<string, unknown[]>>;
    percentage: Partial<Record<string, unknown[]>>;
  }>(
    (memo, statDb) => {
      const type = statDb.type;
      const name = statDb.name.split("_")[1];
      memo[type][name] = memo[type][name] || [];
      memo[type][name]!.push({ timestamp: statDb.timestamp, value: statDb.value });
      return memo;
    },
    { weight: {}, length: {}, percentage: {} }
  );
}
