import { IStorage, IHistoryRecord, IProgram, IWeight, ILength, IStats } from "../../src/types";
import { Settings } from "../../src/models/settings";
import { Utils } from "../utils";
import { CollectionUtils } from "../../src/utils/collection";
import { ObjectUtils } from "../../src/utils/object";
import { IDI } from "../utils/di";

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
  value: IWeight | ILength;
  timestamp: number;
  type: "length" | "weight";
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
        history: [],
        programs: [],
        stats: { weight: {}, length: {} },
        id: 1,
        currentProgramId: undefined,
        version: "0",
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

  public async getById(userId: string): Promise<IUserDao | undefined> {
    const env = Utils.getEnv();

    const userDao = await this.getLimitedById(userId);
    if (userDao != null) {
      const history = await this.di.dynamo.query<IHistoryRecord>({
        tableName: userTableNames[env].historyRecords,
        indexName: userTableNames[env].historyRecordsDate,
        expression: "#userId = :userId",
        scanIndexForward: false,
        attrs: { "#userId": "userId" },
        values: { ":userId": userId },
      });

      const programs = await this.di.dynamo.query<IProgram>({
        tableName: userTableNames[env].programs,
        expression: "#userId = :userId",
        attrs: { "#userId": "userId" },
        values: { ":userId": userId },
      });

      const statsDb = await this.di.dynamo.query<IStatDb>({
        tableName: userTableNames[env].stats,
        expression: "#userId = :userId",
        scanIndexForward: false,
        attrs: { "#userId": "userId" },
        values: { ":userId": userId },
      });
      const stats = convertStatsFromDb(statsDb);

      return { ...userDao, storage: { ...userDao.storage, history, programs, stats } };
    } else {
      return undefined;
    }
  }

  public async saveStorage(user: IUserDao, storage: IStorage): Promise<void> {
    const { history, programs, stats, ...userStorage } = storage;
    const statsObj = stats || { length: {}, weight: {} };
    const env = Utils.getEnv();
    const updatedUser: ILimitedUserDao = { ...user, storage: userStorage };

    const newHistoryIds = CollectionUtils.collectToSet(storage.history, "id");
    const historyToDelete = user.storage.history.filter((r) => !newHistoryIds.has(r.id));
    const newProgramIds = CollectionUtils.collectToSet(storage.programs, "id");
    const programsToDelete = user.storage.programs.filter((r) => !newProgramIds.has(r.id));

    const historyDeletes = CollectionUtils.inGroupsOf(23, historyToDelete).map(async (group) => {
      await this.di.dynamo.batchDelete({
        tableName: userTableNames[env].historyRecords,
        keys: group.map((record) => ({ id: record.id, userId: user.id })),
      });
    });

    const historyUpdates = CollectionUtils.inGroupsOf(23, history).map(async (group) => {
      const items = CollectionUtils.uniqBy(group, "id").map((record) => ({ ...record, userId: user.id }));
      await this.di.dynamo.batchPut({ tableName: userTableNames[env].historyRecords, items });
    });

    const programDeletes = CollectionUtils.inGroupsOf(23, programsToDelete).map(async (group) => {
      await this.di.dynamo.batchDelete({
        tableName: userTableNames[env].programs,
        keys: group.map((record) => ({ id: record.id, userId: user.id })),
      });
    });

    const programUpdates = CollectionUtils.inGroupsOf(23, programs).map(async (group) => {
      await this.di.dynamo.batchPut({
        tableName: userTableNames[env].programs,
        items: group.map((record) => ({ ...record, userId: user.id })),
      });
    });

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
    const statsToDelete = [];
    for (const k of ObjectUtils.keys(user.storage.stats.weight)) {
      const s = user.storage.stats.weight[k];
      for (const v of s || []) {
        const name = `${v.timestamp}_${k}`;
        if (!newStatNames.has(name)) {
          statsToDelete.push(name);
        }
      }
    }
    for (const k of ObjectUtils.keys(user.storage.stats.length)) {
      const s = user.storage.stats.length[k];
      for (const v of s || []) {
        const name = `${v.timestamp}_${k}`;
        if (!newStatNames.has(name)) {
          statsToDelete.push(name);
        }
      }
    }
    const statsDeletes = CollectionUtils.inGroupsOf(23, statsToDelete).map(async (group) => {
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
    const statsArray = statsLengthArray.concat(statsWeightArray);
    const statsUpdates = CollectionUtils.inGroupsOf(23, statsArray).map(async (group) => {
      await this.di.dynamo.batchPut({
        tableName: userTableNames[env].stats,
        items: group.map((record) => ({ ...record, userId: user.id })),
      });
    });

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
          stats: statsDb ? convertStatsFromDb(statsDb) : { weight: {}, length: {} },
        },
      };
    });
  }
}

function convertStatsFromDb(statsDb: IStatDb[]): IStats {
  return statsDb.reduce<{
    weight: Partial<Record<string, unknown[]>>;
    length: Partial<Record<string, unknown[]>>;
  }>(
    (memo, statDb) => {
      const type = statDb.type;
      const name = statDb.name.split("_")[1];
      memo[type][name] = memo[type][name] || [];
      memo[type][name]!.push({ timestamp: statDb.timestamp, value: statDb.value });
      return memo;
    },
    { weight: {}, length: {} }
  );
}
