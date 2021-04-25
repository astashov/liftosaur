import { IStorage, IHistoryRecord, IProgram, IWeight, ILength, IStats } from "../../src/types";
import { Settings } from "../../src/models/settings";
import { Utils } from "../utils";
import { CollectionUtils } from "../../src/utils/collection";
import { ObjectUtils } from "../../src/utils/object";
import { IDI } from "../utils/di";

const tableNames = {
  dev: {
    users: "lftUsersDev",
    usersGoogleId: "lftUsersGoogleIdDev",
    historyRecords: "lftHistoryRecordsDev",
    historyRecordsDate: "lftHistoryRecordsDateDev",
    stats: "lftStatsDev",
    programs: "lftUserProgramsDev",
  },
  prod: {
    users: "lftUsers",
    usersGoogleId: "lftUsersGoogleId",
    historyRecords: "lftHistoryRecords",
    historyRecordsDate: "lftHistoryRecordsDate",
    stats: "lftStats",
    programs: "lftUserPrograms",
  },
} as const;

export interface IUserDao {
  id: string;
  email: string;
  createdAt: number;
  googleId: string;
  storage: IStorage;
}

export type ILimitedUserDao = Omit<IUserDao, "storage"> & {
  storage: Omit<IUserDao["storage"], "programs" | "history" | "stats">;
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
      tableName: tableNames[env].users,
      indexName: tableNames[env].usersGoogleId,
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

  public static build(id: string, googleId: string, email: string): IUserDao {
    return {
      id,
      email,
      googleId,
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
      },
    };
  }

  public async store(user: ILimitedUserDao): Promise<void> {
    const env = Utils.getEnv();
    await this.di.dynamo.put({ tableName: tableNames[env].users, item: user });
  }

  public async getById(userId: string): Promise<IUserDao | undefined> {
    const env = Utils.getEnv();

    const userDao = await this.di.dynamo.get<ILimitedUserDao>({
      tableName: tableNames[env].users,
      key: { id: userId },
    });

    if (userDao != null) {
      const history = await this.di.dynamo.query<IHistoryRecord>({
        tableName: tableNames[env].historyRecords,
        indexName: tableNames[env].historyRecordsDate,
        expression: "#userId = :userId",
        scanIndexForward: false,
        attrs: { "#userId": "userId" },
        values: { ":userId": userId },
      });

      const programs = await this.di.dynamo.query<IProgram>({
        tableName: tableNames[env].programs,
        expression: "#userId = :userId",
        attrs: { "#userId": "userId" },
        values: { ":userId": userId },
      });

      const statsDb = await this.di.dynamo.query<IStatDb>({
        tableName: tableNames[env].stats,
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
        tableName: tableNames[env].historyRecords,
        keys: group.map((record) => ({ id: record.id })),
      });
    });

    const historyUpdates = CollectionUtils.inGroupsOf(23, history).map(async (group) => {
      await this.di.dynamo.batchPut({
        tableName: tableNames[env].historyRecords,
        items: group.map((record) => ({ ...record, userId: user.id })),
      });
    });

    const programDeletes = CollectionUtils.inGroupsOf(23, programsToDelete).map(async (group) => {
      await this.di.dynamo.batchDelete({
        tableName: tableNames[env].programs,
        keys: group.map((record) => ({ id: record.id })),
      });
    });

    const programUpdates = CollectionUtils.inGroupsOf(23, programs).map(async (group) => {
      await this.di.dynamo.batchPut({
        tableName: tableNames[env].programs,
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
        tableName: tableNames[env].stats,
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
        tableName: tableNames[env].stats,
        items: group.map((record) => ({ ...record, userId: user.id })),
      });
    });

    await Promise.all([
      this.store(updatedUser),
      ...historyUpdates,
      ...programUpdates,
      ...statsUpdates,
      ...historyDeletes,
      ...programDeletes,
      ...statsDeletes,
    ]);
  }

  public async getAllLimited(): Promise<ILimitedUserDao[]> {
    const env = Utils.getEnv();
    return this.di.dynamo.scan({ tableName: tableNames[env].users });
  }

  public async getAll(): Promise<IUserDao[]> {
    const env = Utils.getEnv();
    const allUsers = await this.getAllLimited();

    const allHistory = await this.di.dynamo
      .scan<IHistoryRecord & { userId: string }>({ tableName: tableNames[env].historyRecords })
      .then((r) => r.sort((a, b) => new Date(Date.parse(b.date)).getTime() - new Date(Date.parse(a.date)).getTime()));
    const allPrograms = await this.di.dynamo.scan<IProgram & { userId: string }>({
      tableName: tableNames[env].programs,
    });
    const allStatsDbs = await this.di.dynamo.scan<IStatDb & { userId: string }>({ tableName: tableNames[env].stats });

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
