import { DynamoDB } from "aws-sdk";
import { IDynamoUtil } from "../../lambda/utils/dynamo";
import { ILogUtil } from "../../lambda/utils/log";
import deepmerge from "deepmerge";
import { userTableNames } from "../../lambda/dao/userDao";
import { CollectionUtils } from "../../src/utils/collection";
import { ObjectUtils } from "../../src/utils/object";

const idKeys: Partial<Record<string, string[]>> = {
  [userTableNames.prod.users]: ["id"],
  [userTableNames.prod.historyRecords]: ["userId", "id"],
  [userTableNames.prod.programs]: ["userId", "id"],
  [userTableNames.prod.stats]: ["userId", "name"],
};

export class MockDynamoUtil implements IDynamoUtil {
  public data: Record<string, Record<string, unknown>> = {};

  constructor(public readonly log: ILogUtil) {}

  public addMockData<T>(newData: Record<string, Record<string, T>>): void {
    this.data = deepmerge(this.data, newData);
  }

  private buildCondition<T>(args: {
    filterExpression: string;
    attrs?: Record<string, DynamoDB.DocumentClient.AttributeName>;
    values?: Partial<Record<string, string | string[] | number>>;
  }): (item: T) => boolean {
    let expression = args.filterExpression;
    for (const [k, v] of ObjectUtils.entries(args.attrs || {})) {
      expression = expression.replace(new RegExp(k, "g"), v);
    }
    for (const [k, v] of ObjectUtils.entries(args.values || {})) {
      const value = Array.isArray(v) ? `IN (${v.map((x) => `${x}`).join(",")})` : `${v}`;
      expression = expression.replace(new RegExp(k, "g"), value);
    }
    const equalMatch = expression.match(/(.*)\s*=\s*(.*)/);
    if (equalMatch) {
      const key = equalMatch[1].trim();
      const value = equalMatch[2].trim();
      return (item) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, eqeqeq
        return (item as any)[key] == value;
      };
    } else {
      return (_) => true;
    }
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
    let values = (ObjectUtils.values(this.data[args.tableName] || {}) as unknown) as T[];
    values = values.filter(
      this.buildCondition({ filterExpression: args.expression, attrs: args.attrs, values: args.values })
    );
    return Promise.resolve(values);
  }

  public async scan<T>(args: {
    tableName: string;
    filterExpression?: string;
    values?: Partial<Record<string, number | string | string[]>>;
  }): Promise<T[]> {
    let values = ObjectUtils.values(this.data[args.tableName] || {}) as T[];
    if (args.filterExpression) {
      values = values.filter(this.buildCondition({ filterExpression: args.filterExpression, values: args.values }));
    }
    return Promise.resolve(values);
  }

  public async get<T>(args: { tableName: string; key: DynamoDB.DocumentClient.Key }): Promise<T | undefined> {
    const value = this.data[args.tableName]?.[JSON.stringify(args.key)] as T | undefined;
    return value;
  }

  public async put(args: { tableName: string; item: DynamoDB.DocumentClient.PutItemInputAttributeMap }): Promise<void> {
    const keyNames = idKeys[args.tableName];
    if (keyNames) {
      const key = keyNames.reduce((memo, k) => ({ ...memo, [k]: args.item[k] }), {});
      this.data[args.tableName] = this.data[args.tableName] || {};
      this.data[args.tableName][JSON.stringify(key)] = args.item;
    } else {
      throw new Error(`MockDynamo: Missing put key mapping for ${args.tableName}`);
    }
  }
  public async update(args: {
    tableName: string;
    key: DynamoDB.DocumentClient.Key;
    expression: string;
    attrs?: Record<string, DynamoDB.DocumentClient.AttributeName>;
    values?: Partial<Record<string, unknown>>;
  }): Promise<void> {
    // console.log("update", args);
  }
  public async remove(args: { tableName: string; key: DynamoDB.DocumentClient.Key }): Promise<void> {
    // console.log("remove", args);
  }
  public async batchGet<T>(args: { tableName: string; keys: DynamoDB.DocumentClient.Key[] }): Promise<T[]> {
    return CollectionUtils.compact(
      await Promise.all(
        args.keys.map((key) => this.get<T>({ tableName: args.tableName, key }))
      )
    );
  }
  public async batchDelete(args: { tableName: string; keys: DynamoDB.DocumentClient.Key[] }): Promise<void> {
    // console.log("batchDelete", args);
  }
  public async batchPut(args: {
    tableName: string;
    items: DynamoDB.DocumentClient.PutItemInputAttributeMap[];
  }): Promise<void> {
    for (const item of args.items) {
      await this.put({ tableName: args.tableName, item });
    }
  }
}
