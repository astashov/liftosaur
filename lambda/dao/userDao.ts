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
import { Storage } from "../../src/models/storage";
import { Utils } from "../utils";
import { CollectionUtils } from "../../src/utils/collection";
import { ObjectUtils } from "../../src/utils/object";
import { IDI } from "../utils/di";
import { getLatestMigrationVersion } from "../../src/migrations/migrations";
import { freeUsersTableNames } from "./freeUserDao";
import { LogDao, logTableNames } from "./logDao";
import { subscriptionDetailsTableNames } from "./subscriptionDetailsDao";
import { IStorageUpdate } from "../../src/utils/sync";
import { IEither } from "../../src/utils/types";
import { LftS3Buckets } from "./buckets";
import { DateUtils } from "../../src/utils/date";
import * as path from "path";

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
    events: "lftEventsDev",
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
    events: "lftEvents",
  },
} as const;

const bucketNames = {
  dev: {
    programs: `${LftS3Buckets.programs}dev`,
  },
  prod: {
    programs: LftS3Buckets.programs,
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

export type IProgramRevision = {
  program: IProgram;
  userId: string;
  time: string;
};

export type ILimitedUserDao = Omit<IUserDao, "storage"> & {
  storage: IPartialStorage;
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

  public async applySafeSync(
    limitedUser: ILimitedUserDao,
    storageUpdate: IStorageUpdate
  ): Promise<IEither<{ originalId: number; newStorage?: IPartialStorage }, string>> {
    const env = Utils.getEnv();
    const result = await Storage.get(fetch, limitedUser.storage);
    if (!result.success) {
      return { success: false, error: "corrupted_server_storage" };
    }
    const limitedUserStorage = result.data;
    if (limitedUserStorage.version !== storageUpdate.version) {
      return { success: false, error: "outdated_client_storage" };
    }
    const { originalId: oldOriginalId, version, settings, ...restStorageUpdate } = storageUpdate;
    if (Object.keys(restStorageUpdate).length === 0 && ObjectUtils.keys(settings).length === 0) {
      return { success: true, data: { originalId: oldOriginalId || Date.now() } };
    }

    const originalId = Date.now();
    const newStorage = {
      ...Storage.applyUpdate(limitedUserStorage, storageUpdate),
      originalId,
    };

    const historyDeletes = this.di.dynamo.batchDelete({
      tableName: userTableNames[env].historyRecords,
      keys: (storageUpdate.deletedHistory || []).map((id) => ({ id, userId: limitedUser.id })),
    });
    const historyUpdates = this.di.dynamo.batchPut({
      tableName: userTableNames[env].historyRecords,
      items: CollectionUtils.uniqBy(storageUpdate.history || [], "id").map((record) => ({
        ...record,
        userId: limitedUser.id,
      })),
    });

    const userPrograms =
      (storageUpdate.deletedPrograms || []).length > 0 ? await this.getProgramsByUserId(limitedUser.id) : [];
    const programIdsToDelete = userPrograms
      .filter((p) => p.clonedAt != null && (storageUpdate.deletedPrograms || []).indexOf(p.clonedAt) !== -1)
      .map((p) => p.id);
    const programDeletes = this.di.dynamo.batchDelete({
      tableName: userTableNames[env].programs,
      keys: programIdsToDelete.map((id) => ({ id, userId: limitedUser.id })),
    });

    const programUpdates = this.di.dynamo.batchPut({
      tableName: userTableNames[env].programs,
      items: (storageUpdate.programs || []).map((record) => ({ ...record, userId: limitedUser.id })),
    });

    const stats = storageUpdate.stats;
    const statsDb = ObjectUtils.keys(stats || {})
      .map((type) => {
        return (stats?.[type] || []).map((stat) => {
          const name = `${stat.timestamp}_${type}`;
          const statDb: IStatDb = { ...stat, name };
          return statDb;
        });
      })
      .flat();
    const statsDeletes =
      (storageUpdate.deletedStats || []).length > 0
        ? (async () => {
            const userStats = await this.di.dynamo.query<IStatDb & { userId?: string }>({
              tableName: userTableNames[env].stats,
              expression: "#userId = :userId",
              attrs: { "#userId": "userId" },
              values: { ":userId": limitedUser.id },
            });
            const statsIdToDelete = userStats.filter((s) => storageUpdate.deletedStats?.indexOf(s.timestamp) !== -1);
            return this.di.dynamo.batchDelete({
              tableName: userTableNames[env].stats,
              keys: statsIdToDelete.map((s) => ({ userId: limitedUser.id, name: s.name })),
            });
          })()
        : Promise.resolve();
    const statsUpdates = this.di.dynamo.batchPut({
      tableName: userTableNames[env].stats,
      items: statsDb.map((record) => ({ ...record, userId: limitedUser.id })),
    });

    delete newStorage.history;
    delete newStorage.programs;
    delete newStorage.stats;
    await Promise.all([
      this.store({ ...limitedUser, storage: newStorage }),
      historyUpdates,
      historyDeletes,
      programUpdates,
      programDeletes,
      statsDeletes,
      statsUpdates,
    ]);
    return { data: { originalId, newStorage }, success: true };
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

  public async getByEmail(email: string): Promise<ILimitedUserDao | undefined> {
    const env = Utils.getEnv();

    const users = await this.di.dynamo.scan<ILimitedUserDao>({
      tableName: userTableNames[env].users,
      filterExpression: "email = :email",
      values: { ":email": email },
    });
    return users[0];
  }

  public static build(id: string, email: string, opts: { appleId?: string; googleId?: string }): IUserDao {
    return {
      id,
      email,
      googleId: opts.googleId,
      appleId: opts.appleId,
      createdAt: Date.now(),
      storage: {
        deletedHistory: [],
        deletedPrograms: [],
        deletedStats: [],
        affiliates: {},
        signupRequests: [],
        reviewRequests: [],
        history: [],
        programs: [],
        stats: { weight: {}, length: {}, percentage: {} },
        id: Date.now(),
        currentProgramId: undefined,
        version: getLatestMigrationVersion(),
        helps: [],
        tempUserId: id,
        settings: Settings.build(),
        subscription: { apple: {}, google: {} },
        email,
        whatsNew: undefined,
      },
    };
  }

  public async saveProgram(userId: string, program: IProgram): Promise<void> {
    const env = Utils.getEnv();
    await this.di.dynamo.put({
      tableName: userTableNames[env].programs,
      item: { ...program, userId },
    });
  }

  public async deleteProgram(userId: string, id: string): Promise<void> {
    const env = Utils.getEnv();
    await this.di.dynamo.remove({
      tableName: userTableNames[env].programs,
      key: { id, userId },
    });
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
    return this.di.dynamo
      .query<IHistoryRecord & { userId?: string }>({
        tableName: userTableNames[env].historyRecords,
        indexName: userTableNames[env].historyRecordsDate,
        expression: "#userId = :userId",
        scanIndexForward: false,
        attrs: { "#userId": "userId" },
        values: { ":userId": userId },
      })
      .then((arr) =>
        arr.map((r) => {
          delete r.userId;
          return r;
        })
      );
  }

  public async getStatsByUserId(userId: string): Promise<IStats> {
    const env = Utils.getEnv();
    const statsDb = await this.di.dynamo.query<IStatDb & { userId?: string }>({
      tableName: userTableNames[env].stats,
      expression: "#userId = :userId",
      scanIndexForward: false,
      attrs: { "#userId": "userId" },
      values: { ":userId": userId },
    });
    return convertStatsFromDb(
      statsDb.map((s) => {
        const { userId: uid, ...rest } = s;
        return rest;
      })
    );
  }

  public getProgramsByUserId(userId: string): Promise<IProgram[]> {
    const env = Utils.getEnv();
    return this.di.dynamo
      .query<IProgram & { userId?: string }>({
        tableName: userTableNames[env].programs,
        expression: "#userId = :userId",
        attrs: { "#userId": "userId" },
        values: { ":userId": userId },
      })
      .then((arr) =>
        arr.map((r) => {
          delete r.userId;
          return r;
        })
      );
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

  public getProgram(userId: string, id: string): Promise<IProgram | undefined> {
    const env = Utils.getEnv();
    return this.di.dynamo.get<IProgram & { userId?: string }>({
      tableName: userTableNames[env].programs,
      key: { id, userId },
    });
  }

  public async transfer(fromId: string, toId: string): Promise<void> {
    const fromUser = await this.getLimitedById(fromId);
    const toUser = await this.getLimitedById(toId);

    if (fromUser && toUser) {
      const toIsApple = toUser.appleId != null;

      const token = toIsApple ? toUser.appleId : toUser.googleId;
      if (toIsApple) {
        fromUser.appleId = token;
        delete fromUser.googleId;
      } else {
        fromUser.googleId = token;
        delete fromUser.appleId;
      }
      fromUser.email = toUser.email;
      fromUser.storage.email = toUser.email;
      await this.store(fromUser);
    } else {
      throw new Error("Missing users");
    }
  }

  public async removeUser(userId: string): Promise<void> {
    const env = Utils.getEnv();
    const programs = await this.getProgramsByUserId(userId);
    const programIds = Array.from(new Set(programs.map((p) => p.id)));
    if (programIds.length > 0) {
      await Promise.all(
        CollectionUtils.inGroupsOf(23, programIds).map((group) => {
          return this.di.dynamo.batchDelete({
            tableName: userTableNames[env].programs,
            keys: group.map((id) => ({ id, userId })),
          });
        })
      );
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
      await Promise.all(
        CollectionUtils.inGroupsOf(23, names).map((group) => {
          return this.di.dynamo.batchDelete({
            tableName: userTableNames[env].stats,
            keys: group.map((name) => ({ name, userId })),
          });
        })
      );
    }

    const historyRecords = await this.getHistoryByUserId(userId);
    const historyRecordIds = Array.from(new Set(historyRecords.map((p) => p.id)));
    if (historyRecordIds.length > 0) {
      await Promise.all(
        CollectionUtils.inGroupsOf(23, historyRecordIds).map((group) => {
          return this.di.dynamo.batchDelete({
            tableName: userTableNames[env].historyRecords,
            keys: group.map((id) => ({ id, userId })),
          });
        })
      );
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
      await Promise.all(
        CollectionUtils.inGroupsOf(23, actions).map((group) => {
          return this.di.dynamo.batchDelete({
            tableName: logTableNames[env].logs,
            keys: group.map((action) => ({ action, userId })),
          });
        })
      );
    }
  }

  public async getById(
    userId: string,
    args?: {
      skipHistory?: boolean;
      skipPrograms?: boolean;
      skipStats?: boolean;
    }
  ): Promise<IUserDao | undefined> {
    const userDao = await this.getLimitedById(userId);
    if (userDao != null) {
      const history = !args?.skipHistory ? await this.getHistoryByUserId(userId) : [];
      const programs = !args?.skipPrograms ? await this.getProgramsByUserId(userId) : [];
      const stats = !args?.skipStats ? await this.getStatsByUserId(userId) : { weight: {}, length: {}, percentage: {} };

      return { ...userDao, storage: { ...userDao.storage, history, programs, stats } };
    } else {
      return undefined;
    }
  }

  public async maybeSaveProgramRevision(userId: string, storageUpdate: IStorageUpdate): Promise<void> {
    const programs = storageUpdate.programs || [];
    await Promise.all(programs.map((p) => this.saveProgramRevision(userId, p)));
  }

  public async saveProgramRevision(userId: string, program: IProgram): Promise<void> {
    if (program.planner == null) {
      return;
    }
    const env = Utils.getEnv();
    const now = Date.now();
    const date = DateUtils.formatYYYYMMDDHHMM(now);
    const programRevision: IProgramRevision = { program, userId, time: date };
    await this.di.s3.putObject({
      bucket: bucketNames[env].programs,
      key: `programs/${userId}/${program.id}/${date}.json`,
      body: JSON.stringify(programRevision),
      opts: { contentType: "application/json" },
    });
    const revisions = await this.listProgramRevisions(userId, program.id);
    const revisionsToRemove = revisions.slice(100);
    await Promise.all(
      revisionsToRemove.map((r) => {
        return this.di.s3.deleteObject({
          bucket: bucketNames[env].programs,
          key: `programs/${userId}/${program.id}/${r}.json`,
        });
      })
    );
  }

  public async listProgramRevisions(userId: string, programId: string): Promise<string[]> {
    const env = Utils.getEnv();
    const result = await this.di.s3.listObjects({
      bucket: bucketNames[env].programs,
      prefix: `programs/${userId}/${programId}`,
    });
    const revisions = (result || []).map((p) => path.basename(p, path.extname(p)));
    revisions.sort((a, b) => b.localeCompare(a));
    return revisions;
  }

  public async getProgramRevision(
    userId: string,
    programId: string,
    revision: string
  ): Promise<IProgramRevision | undefined> {
    const env = Utils.getEnv();
    const programRevision = await this.di.s3.getObject({
      bucket: bucketNames[env].programs,
      key: `programs/${userId}/${programId}/${revision}.json`,
    });
    if (programRevision == null) {
      return undefined;
    }
    return JSON.parse(programRevision.toString());
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
