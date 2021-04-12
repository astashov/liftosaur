import { DynamoDB } from "aws-sdk";
import { Utils } from "../utils";

const tableNames = {
  dev: {
    logs: "lftLogsDev",
  },
  prod: {
    logs: "lftLogs",
  },
} as const;

export interface ILogDao {
  userId: string;
  action: string;
  cnt: number;
  ts: number;
}

export class LogDao {
  public static async getAll(): Promise<ILogDao[]> {
    const env = Utils.getEnv();
    const dynamo = new DynamoDB.DocumentClient();
    const result = await dynamo.scan({ TableName: tableNames[env].logs }).promise();
    return (result.Items || []) as ILogDao[];
  }

  public static async increment(userId: string, action: string): Promise<void> {
    const env = Utils.getEnv();
    const dynamo = new DynamoDB.DocumentClient();
    const record = await dynamo.get({ TableName: tableNames[env].logs, Key: { userId, action } }).promise();
    const count: number = record?.Item?.cnt || 0;
    await dynamo
      .update({
        TableName: tableNames[env].logs,
        Key: { userId, action },
        UpdateExpression: "SET ts = :timestamp, cnt = :cnt",
        ExpressionAttributeValues: {
          ":timestamp": Date.now(),
          ":cnt": count + 1,
        },
      })
      .promise();
  }
}
