import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandOutput,
  ScanCommand,
  ScanCommandOutput,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  BatchGetCommand,
  BatchWriteCommand,
  NativeAttributeValue,
} from "@aws-sdk/lib-dynamodb";
import { CollectionUtils } from "../../src/utils/collection";
import { ILogUtil } from "./log";

export interface IDynamoUtil {
  query<T>(args: {
    tableName: string;
    expression: string;
    filterExpression?: string;
    indexName?: string;
    scanIndexForward?: boolean;
    attrs?: Record<string, string>;
    values?: Partial<Record<string, string | string[] | number | number[]>>;
    limit?: number;
  }): Promise<T[]>;
  scan<T>(args: {
    tableName: string;
    filterExpression?: string;
    names?: Record<string, string>;
    values?: Partial<Record<string, number | string | string[]>>;
    limit?: number;
  }): Promise<T[]>;
  streamingQuery<T>(args: {
    tableName: string;
    expression: string;
    filterExpression?: string;
    indexName?: string;
    scanIndexForward?: boolean;
    attrs?: Record<string, string>;
    values?: Partial<Record<string, string | string[] | number | number[]>>;
    limit?: number;
  }): AsyncGenerator<T[], void, unknown>;
  streamingScan<T>(args: {
    tableName: string;
    filterExpression?: string;
    names?: Record<string, string>;
    values?: Partial<Record<string, number | string | string[]>>;
  }): AsyncGenerator<T[], void, unknown>;
  get<T>(args: { tableName: string; key: Record<string, NativeAttributeValue> }): Promise<T | undefined>;
  put(args: { tableName: string; item: Record<string, NativeAttributeValue> }): Promise<void>;
  putIfNotExists(args: {
    tableName: string;
    item: Record<string, NativeAttributeValue>;
    partitionKey: string;
    sortKey?: string;
  }): Promise<boolean>;
  update(args: {
    tableName: string;
    key: Record<string, NativeAttributeValue>;
    expression: string;
    attrs?: Record<string, string>;
    values?: Partial<Record<string, NativeAttributeValue>>;
  }): Promise<void>;
  remove(args: { tableName: string; key: Record<string, NativeAttributeValue> }): Promise<void>;
  batchGet<T>(args: { tableName: string; keys: Record<string, NativeAttributeValue>[] }): Promise<T[]>;
  batchDelete(args: { tableName: string; keys: Record<string, NativeAttributeValue>[] }): Promise<void>;
  batchPut(args: { tableName: string; items: Record<string, NativeAttributeValue>[] }): Promise<void>;
}

export class DynamoUtil implements IDynamoUtil {
  private _dynamo?: DynamoDBDocumentClient;

  constructor(private readonly log: ILogUtil) {}

  private get dynamo(): DynamoDBDocumentClient {
    if (this._dynamo == null) {
      this._dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
        marshallOptions: { removeUndefinedValues: true },
      });
    }
    return this._dynamo;
  }

  public async query<T>(args: {
    tableName: string;
    expression: string;
    filterExpression?: string;
    indexName?: string;
    scanIndexForward?: boolean;
    attrs?: Record<string, string>;
    values?: Partial<Record<string, string | string[] | number>>;
    limit?: number;
  }): Promise<T[]> {
    const startTime = Date.now();
    try {
      const result = await paginatedQuery<T>(async (key) => {
        return this.dynamo.send(
          new QueryCommand({
            TableName: args.tableName,
            IndexName: args.indexName,
            ExclusiveStartKey: key,
            ScanIndexForward: args.scanIndexForward,
            KeyConditionExpression: args.expression,
            FilterExpression: args.filterExpression,
            ExpressionAttributeNames: args.attrs,
            ExpressionAttributeValues: args.values,
            Limit: args.limit,
          })
        );
      }, args.limit);
      this.log.log(
        `Dynamo query: ${args.tableName}${args.indexName ? ` (${args.indexName})` : ""} - `,
        args.expression,
        args.attrs,
        args.values,
        ` - ${Date.now() - startTime}ms`
      );
      return result;
    } catch (e) {
      this.log.log(
        `FAILED Dynamo query: ${args.tableName}${args.indexName ? ` (${args.indexName})` : ""} - `,
        args.expression,
        args.attrs,
        args.values,
        ` - ${Date.now() - startTime}ms`
      );
      throw e;
    }
  }

  public async scan<T>(args: {
    tableName: string;
    filterExpression?: string;
    names?: Record<string, string>;
    values?: Partial<Record<string, number | string | string[]>>;
    limit?: number;
  }): Promise<T[]> {
    const startTime = Date.now();
    try {
      const result = await paginatedQuery<T>(async (key) => {
        return this.dynamo.send(
          new ScanCommand({
            TableName: args.tableName,
            ExclusiveStartKey: key,
            FilterExpression: args.filterExpression,
            ExpressionAttributeNames: args.names,
            ExpressionAttributeValues: args.values,
            Limit: args.limit,
          })
        );
      }, args.limit);
      this.log.log(`Dynamo scan: ${args.tableName} - `, args.tableName, ` - ${Date.now() - startTime}ms`);
      return result;
    } catch (e) {
      this.log.log(`FAILED Dynamo scan: ${args.tableName} - `, args.tableName, ` - ${Date.now() - startTime}ms`);
      throw e;
    }
  }

  public async *streamingQuery<T>(args: {
    tableName: string;
    expression: string;
    filterExpression?: string;
    indexName?: string;
    scanIndexForward?: boolean;
    attrs?: Record<string, string>;
    values?: Partial<Record<string, string | string[] | number>>;
    limit?: number;
  }): AsyncGenerator<T[], void, unknown> {
    const startTime = Date.now();
    let totalItems = 0;

    try {
      for await (const batch of streamingPaginatedQuery<T>(async (key) => {
        return this.dynamo.send(
          new QueryCommand({
            TableName: args.tableName,
            IndexName: args.indexName,
            ExclusiveStartKey: key,
            ScanIndexForward: args.scanIndexForward,
            KeyConditionExpression: args.expression,
            FilterExpression: args.filterExpression,
            ExpressionAttributeNames: args.attrs,
            ExpressionAttributeValues: args.values,
            Limit: args.limit,
          })
        );
      }, args.limit)) {
        yield batch;
        totalItems += batch.length;
      }

      this.log.log(
        `Dynamo streaming query completed: ${args.tableName}${args.indexName ? ` (${args.indexName})` : ""} - `,
        args.expression,
        args.attrs,
        args.values,
        ` - ${totalItems} items - ${Date.now() - startTime}ms`
      );
    } catch (e) {
      this.log.log(
        `FAILED Dynamo streaming query: ${args.tableName}${args.indexName ? ` (${args.indexName})` : ""} - `,
        args.expression,
        args.attrs,
        args.values,
        ` - ${Date.now() - startTime}ms`
      );
      throw e;
    }
  }

  public async *streamingScan<T>(args: {
    tableName: string;
    filterExpression?: string;
    names?: Record<string, string>;
    values?: Partial<Record<string, number | string | string[]>>;
  }): AsyncGenerator<T[], void, unknown> {
    const startTime = Date.now();
    let totalItems = 0;

    try {
      for await (const batch of streamingPaginatedQuery<T>(async (key) => {
        return this.dynamo.send(
          new ScanCommand({
            TableName: args.tableName,
            ExclusiveStartKey: key,
            FilterExpression: args.filterExpression,
            ExpressionAttributeNames: args.names,
            ExpressionAttributeValues: args.values,
          })
        );
      })) {
        yield batch;
        totalItems += batch.length;
      }

      this.log.log(
        `Dynamo streaming scan completed: ${args.tableName} - ${totalItems} items - ${Date.now() - startTime}ms`
      );
    } catch (e) {
      this.log.log(`FAILED Dynamo streaming scan: ${args.tableName} - ${Date.now() - startTime}ms`);
      throw e;
    }
  }

  public async get<T>(args: { tableName: string; key: Record<string, NativeAttributeValue> }): Promise<T | undefined> {
    const startTime = Date.now();
    try {
      const result = await this.dynamo.send(new GetCommand({ TableName: args.tableName, Key: args.key }));
      this.log.log(`Dynamo get: ${args.tableName} - `, args.key, ` - ${Date.now() - startTime}ms`);
      return result.Item as T | undefined;
    } catch (error) {
      const e = error as Error & { name?: string };
      this.log.log(`FAILED Dynamo get: ${args.tableName} - `, args.key, ` - ${Date.now() - startTime}ms`);
      if (e.name === "ResourceNotFoundException") {
        return undefined;
      } else {
        throw e;
      }
    }
  }

  public async put(args: { tableName: string; item: Record<string, NativeAttributeValue> }): Promise<void> {
    const startTime = Date.now();
    try {
      await this.dynamo.send(new PutCommand({ TableName: args.tableName, Item: args.item }));
    } catch (error) {
      const e = error as Error;
      this.log.log(`FAILED Dynamo put: ${args.tableName} - `, args.item, ` - ${Date.now() - startTime}ms`);
      this.log.log(e.message);
      this.log.log(e.stack);
      throw e;
    }
    this.log.log(`Dynamo put: ${args.tableName} - `, args.item, ` - ${Date.now() - startTime}ms`);
  }

  public async putIfNotExists(args: {
    tableName: string;
    item: Record<string, NativeAttributeValue>;
    partitionKey: string;
    sortKey?: string;
  }): Promise<boolean> {
    const startTime = Date.now();
    try {
      let conditionExpression = `attribute_not_exists(#pk)`;
      const expressionAttributeNames: Record<string, string> = {
        "#pk": args.partitionKey,
      };

      if (args.sortKey) {
        conditionExpression += ` AND attribute_not_exists(#sk)`;
        expressionAttributeNames["#sk"] = args.sortKey;
      }

      await this.dynamo.send(
        new PutCommand({
          TableName: args.tableName,
          Item: args.item,
          ConditionExpression: conditionExpression,
          ExpressionAttributeNames: expressionAttributeNames,
        })
      );

      this.log.log(
        `Dynamo putIfNotExists (inserted): ${args.tableName} - `,
        args.item,
        ` - ${Date.now() - startTime}ms`
      );
      return true;
    } catch (error) {
      const e = error as Error & { name?: string };
      if (e.name === "ConditionalCheckFailedException") {
        this.log.log(
          `Dynamo putIfNotExists (already exists): ${args.tableName} - `,
          args.item,
          ` - ${Date.now() - startTime}ms`
        );
        return false;
      }
      this.log.log(`FAILED Dynamo putIfNotExists: ${args.tableName} - `, args.item, ` - ${Date.now() - startTime}ms`);
      this.log.log(e.message);
      this.log.log(e.stack);
      throw e;
    }
  }

  public async update(args: {
    tableName: string;
    key: Record<string, NativeAttributeValue>;
    expression: string;
    attrs?: Record<string, string>;
    values?: Partial<Record<string, NativeAttributeValue>>;
  }): Promise<void> {
    const startTime = Date.now();
    try {
      await this.dynamo.send(
        new UpdateCommand({
          TableName: args.tableName,
          Key: args.key,
          UpdateExpression: args.expression,
          ExpressionAttributeNames: args.attrs,
          ExpressionAttributeValues: args.values,
        })
      );
    } catch (e) {
      this.log.log(
        `FAILED Dynamo update: ${args.tableName} - `,
        args.key,
        args.expression,
        args.values,
        ` - ${Date.now() - startTime}ms`
      );
      throw e;
    }
    this.log.log(
      `Dynamo update: ${args.tableName} - `,
      args.key,
      args.expression,
      args.values,
      ` - ${Date.now() - startTime}ms`
    );
  }

  public async remove(args: { tableName: string; key: Record<string, NativeAttributeValue> }): Promise<void> {
    const startTime = Date.now();
    try {
      await this.dynamo.send(
        new DeleteCommand({
          TableName: args.tableName,
          Key: args.key,
        })
      );
    } catch (e) {
      this.log.log(`FAILED Dynamo delete: ${args.tableName} - `, args.key, ` - ${Date.now() - startTime}ms`);
      throw e;
    }
    this.log.log(`Dynamo delete: ${args.tableName} - `, args.key, ` - ${Date.now() - startTime}ms`);
  }

  public async batchGet<T>(args: { tableName: string; keys: Record<string, NativeAttributeValue>[] }): Promise<T[]> {
    const startTime = Date.now();
    try {
      const result = await Promise.all(
        CollectionUtils.inGroupsOf(95, args.keys).map((group) => {
          return this.dynamo.send(new BatchGetCommand({ RequestItems: { [args.tableName]: { Keys: group } } }));
        })
      );
      this.log.log(`Dynamo batch get: ${args.tableName} - `, args.keys, ` - ${Date.now() - startTime}ms`);
      return CollectionUtils.compact(result.map((r) => r.Responses?.[args.tableName] || [])).flat() as T[];
    } catch (e) {
      this.log.log(`FAILED Dynamo batch get: ${args.tableName} - `, args.keys, ` - ${Date.now() - startTime}ms`);
      throw e;
    }
  }

  public async batchDelete(args: { tableName: string; keys: Record<string, NativeAttributeValue>[] }): Promise<void> {
    if (args.keys.length === 0) {
      return;
    }
    await Promise.all(
      CollectionUtils.inGroupsOf(25, args.keys).map(async (group) => {
        const startTime = Date.now();
        try {
          await this.dynamo.send(
            new BatchWriteCommand({
              RequestItems: {
                [args.tableName]: group.map((key) => ({
                  DeleteRequest: {
                    Key: key,
                  },
                })),
              },
            })
          );
        } catch (e) {
          this.log.log(`FAILED Dynamo batch delete: ${args.tableName} - `, group, ` - ${Date.now() - startTime}ms`);
          throw e;
        }
        this.log.log(`Dynamo batch delete: ${args.tableName} - `, group, ` - ${Date.now() - startTime}ms`);
      })
    );
  }

  public async batchPut(args: { tableName: string; items: Record<string, NativeAttributeValue>[] }): Promise<void> {
    if (args.items.length === 0) {
      return;
    }
    await Promise.all(
      CollectionUtils.inGroupsOf(25, args.items).map(async (group) => {
        const startTime = Date.now();
        try {
          await this.dynamo.send(
            new BatchWriteCommand({
              RequestItems: {
                [args.tableName]: group.map((item) => ({
                  PutRequest: {
                    Item: item,
                  },
                })),
              },
            })
          );
        } catch (e) {
          this.log.log(
            `FAILED Dynamo batch put: ${args.tableName}`,
            `${group.length} items`,
            ` - ${Date.now() - startTime}ms`
          );
          if (e instanceof Error && e.message.includes("Provided list of item keys contains duplicates")) {
            this.log.log(
              "Duplicated ids: ",
              group.map((item) => ("id" in item ? item.id : ""))
            );
            this.log.log(
              "Duplicated items: ",
              group.map((item) => JSON.stringify(item))
            );
          }
          if (e instanceof Error && e.message.includes("Item size has exceeded the maximum allowed size")) {
            try {
              const json = JSON.stringify(group);
              this.log.log(`batchPut payload length: ${json.length}`);
              for (let i = 0; i < group.length; i++) {
                const item = group[i];
                const jsonItem = JSON.stringify(item);
                this.log.log(`batchPut payload[${i}] length: ${JSON.stringify(jsonItem).length}`);
                if (jsonItem.length > 100000) {
                  this.log.log(`batchPut payload[${i}]: ${jsonItem.slice(0, 100000)}`);
                }
              }
              this.log.log(JSON);
            } catch (error) {
              this.log.log("Failed to log batchPut payload");
              this.log.log(error);
            }
          }
          throw e;
        }
        this.log.log(`Dynamo batch put: ${args.tableName}`, `${group.length} items`, ` - ${Date.now() - startTime}ms`);
      })
    );
  }
}

async function paginatedQuery<T>(
  cb: (key?: Record<string, NativeAttributeValue>) => Promise<QueryCommandOutput | ScanCommandOutput>,
  limit?: number
): Promise<T[]> {
  let key: Record<string, NativeAttributeValue> | undefined;
  let items: Record<string, NativeAttributeValue>[] = [];
  do {
    const result = await cb(key);
    items = items.concat(result.Items || []);
    if (limit != null && items.length >= limit) {
      break;
    }
    key = result.LastEvaluatedKey;
  } while (key);
  return items as T[];
}

async function* streamingPaginatedQuery<T>(
  cb: (key?: Record<string, NativeAttributeValue>) => Promise<QueryCommandOutput | ScanCommandOutput>,
  limit?: number
): AsyncGenerator<T[], void, unknown> {
  let key: Record<string, NativeAttributeValue> | undefined;
  let totalItems = 0;

  do {
    const result = await cb(key);
    const items = result.Items || [];

    if (items.length > 0) {
      yield items as T[];
      totalItems += items.length;
    }

    if (limit != null && totalItems >= limit) {
      break;
    }

    key = result.LastEvaluatedKey;
  } while (key);
}
