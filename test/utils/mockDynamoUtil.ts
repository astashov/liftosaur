import { DynamoDB } from "aws-sdk";
import { IDynamoUtil } from "../../lambda/utils/dynamo";
import { ILogUtil } from "../../lambda/utils/log";
import deepmerge from "deepmerge";

export class MockDynamoUtil implements IDynamoUtil {
  public data: Record<string, Record<string, unknown>> = {};

  constructor(public readonly log: ILogUtil) {}

  public addMockData<T>(newData: Record<string, Record<string, T>>): void {
    this.data = deepmerge(this.data, newData);
  }

  public async query<T>(args: {
    tableName: string;
    expression: string;
    filterExpression?: string;
    indexName?: string;
    scanIndexForward?: boolean;
    attrs?: Record<string, DynamoDB.DocumentClient.AttributeName>;
    values?: Partial<Record<string, string | string[] | number>>;
  }): Promise<T[]> {
    console.log("query", args);
    return Promise.resolve([]);
  }
  public async scan<T>(args: {
    tableName: string;
    filterExpression?: string;
    values?: Partial<Record<string, number | string | string[]>>;
  }): Promise<T[]> {
    console.log("scan", args);
    return Promise.resolve([]);
  }
  public async get<T>(args: { tableName: string; key: DynamoDB.DocumentClient.Key }): Promise<T | undefined> {
    const value = this.data[args.tableName]?.[JSON.stringify(args.key)] as T | undefined;
    console.log("Get", args, "return", value);
    return value;
  }
  public async put(args: { tableName: string; item: DynamoDB.DocumentClient.PutItemInputAttributeMap }): Promise<void> {
    console.log("put", args);
  }
  public async update(args: {
    tableName: string;
    key: DynamoDB.DocumentClient.Key;
    expression: string;
    attrs?: Record<string, DynamoDB.DocumentClient.AttributeName>;
    values?: Partial<Record<string, unknown>>;
  }): Promise<void> {
    console.log("update", args);
  }
  public async remove(args: { tableName: string; key: DynamoDB.DocumentClient.Key }): Promise<void> {
    console.log("remove", args);
  }
  public async batchGet<T>(args: { tableName: string; keys: DynamoDB.DocumentClient.Key[] }): Promise<T[]> {
    console.log("batchGet", args);
    return Promise.resolve([]);
  }
  public async batchDelete(args: { tableName: string; keys: DynamoDB.DocumentClient.Key[] }): Promise<void> {
    console.log("batchDelete", args);
  }
  public async batchPut(args: {
    tableName: string;
    items: DynamoDB.DocumentClient.PutItemInputAttributeMap[];
  }): Promise<void> {
    console.log("batchPut", args);
  }
}
