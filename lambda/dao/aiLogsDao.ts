import { Utils } from "../utils";
import { IDI } from "../utils/di";
import { UidFactory } from "../utils/generator";

const tableNames = {
  dev: {
    aiLogs: "lftAiLogsDev",
    userIdIndex: "userId-timestamp-index",
  },
  prod: {
    aiLogs: "lftAiLogs",
    userIdIndex: "userId-timestamp-index",
  },
} as const;

export interface IAiLogDao {
  id: string; // Primary key
  userId: string; // GSI partition key
  email?: string;
  input: string;
  response: string;
  timestamp: number; // GSI sort key
  ttl?: number; // TTL for auto-deletion
  model?: string;
  error?: string;
}

export class AiLogsDao {
  constructor(private readonly di: IDI) {}

  public async create(log: Omit<IAiLogDao, "id" | "ttl">): Promise<void> {
    const env = Utils.getEnv();
    try {
      await this.di.dynamo.put({
        tableName: tableNames[env].aiLogs,
        item: {
          ...log,
          id: UidFactory.generateUid(16),
          ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now in seconds
        },
      });
    } catch (error) {
      // Don't throw - we don't want logging failures to break the main flow
      this.di.log.log("Error saving AI log:", error);
    }
  }

  public async getByUserId(userId: string, limit: number = 100): Promise<IAiLogDao[]> {
    const env = Utils.getEnv();
    const result = await this.di.dynamo.query<IAiLogDao>({
      tableName: tableNames[env].aiLogs,
      indexName: tableNames[env].userIdIndex,
      expression: "userId = :userId",
      values: { ":userId": userId },
      scanIndexForward: false, // Most recent first
      limit,
    });
    return result;
  }

  public async getByDateRange(startTime: number, endTime: number, limit: number = 1000): Promise<IAiLogDao[]> {
    const env = Utils.getEnv();
    const result = await this.di.dynamo.scan<IAiLogDao>({
      tableName: tableNames[env].aiLogs,
      filterExpression: "timestamp BETWEEN :start AND :end",
      values: {
        ":start": startTime,
        ":end": endTime,
      },
    });
    return result.slice(0, limit);
  }

  public async getAll(limit: number = 1000): Promise<IAiLogDao[]> {
    const env = Utils.getEnv();
    const result = await this.di.dynamo.scan<IAiLogDao>({
      tableName: tableNames[env].aiLogs,
    });
    return result.slice(0, limit);
  }
}
