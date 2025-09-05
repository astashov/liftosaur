import { Request, DynamoDB, AWSError } from "aws-sdk";
import { CollectionUtils } from "../../src/utils/collection";
import { ILogUtil } from "./log";

export interface IDynamoUtil {
  query<T>(args: {
    tableName: string;
    expression: string;
    filterExpression?: string;
    indexName?: string;
    scanIndexForward?: boolean;
    attrs?: Record<string, DynamoDB.DocumentClient.AttributeName>;
    values?: Partial<Record<string, string | string[] | number | number[]>>;
    limit?: number;
  }): Promise<T[]>;
  scan<T>(args: {
    tableName: string;
    filterExpression?: string;
    names?: Record<string, DynamoDB.DocumentClient.AttributeName>;
    values?: Partial<Record<string, number | string | string[]>>;
  }): Promise<T[]>;
  streamingQuery<T>(args: {
    tableName: string;
    expression: string;
    filterExpression?: string;
    indexName?: string;
    scanIndexForward?: boolean;
    attrs?: Record<string, DynamoDB.DocumentClient.AttributeName>;
    values?: Partial<Record<string, string | string[] | number | number[]>>;
    limit?: number;
  }): AsyncGenerator<T[], void, unknown>;
  streamingScan<T>(args: {
    tableName: string;
    filterExpression?: string;
    names?: Record<string, DynamoDB.DocumentClient.AttributeName>;
    values?: Partial<Record<string, number | string | string[]>>;
  }): AsyncGenerator<T[], void, unknown>;
  get<T>(args: { tableName: string; key: DynamoDB.DocumentClient.Key }): Promise<T | undefined>;
  put(args: { tableName: string; item: DynamoDB.DocumentClient.PutItemInputAttributeMap }): Promise<void>;
  update(args: {
    tableName: string;
    key: DynamoDB.DocumentClient.Key;
    expression: string;
    attrs?: Record<string, DynamoDB.DocumentClient.AttributeName>;
    values?: Partial<Record<string, unknown>>;
  }): Promise<void>;
  remove(args: { tableName: string; key: DynamoDB.DocumentClient.Key }): Promise<void>;
  batchGet<T>(args: { tableName: string; keys: DynamoDB.DocumentClient.Key[] }): Promise<T[]>;
  batchDelete(args: { tableName: string; keys: DynamoDB.DocumentClient.Key[] }): Promise<void>;
  batchPut(args: { tableName: string; items: DynamoDB.DocumentClient.PutItemInputAttributeMap[] }): Promise<void>;
}

export class DynamoUtil implements IDynamoUtil {
  private _dynamo?: DynamoDB.DocumentClient;

  constructor(private readonly log: ILogUtil) {}

  private get dynamo(): DynamoDB.DocumentClient {
    if (this._dynamo == null) {
      this._dynamo = new DynamoDB.DocumentClient();
    }
    return this._dynamo;
  }

  public async query<T>(args: {
    tableName: string;
    expression: string;
    filterExpression?: string;
    indexName?: string;
    scanIndexForward?: boolean;
    attrs?: Record<string, DynamoDB.DocumentClient.AttributeName>;
    values?: Partial<Record<string, string | string[] | number>>;
    limit?: number;
  }): Promise<T[]> {
    const startTime = Date.now();
    try {
      const result = await query<T>((key) => {
        return this.dynamo.query({
          TableName: args.tableName,
          IndexName: args.indexName,
          ExclusiveStartKey: key,
          ScanIndexForward: args.scanIndexForward,
          KeyConditionExpression: args.expression,
          FilterExpression: args.filterExpression,
          ExpressionAttributeNames: args.attrs,
          ExpressionAttributeValues: args.values,
          Limit: args.limit,
        });
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
    names?: Record<string, DynamoDB.DocumentClient.AttributeName>;
    values?: Partial<Record<string, number | string | string[]>>;
  }): Promise<T[]> {
    const startTime = Date.now();
    try {
      const result = await query<T>((key) => {
        return this.dynamo.scan({
          TableName: args.tableName,
          ExclusiveStartKey: key,
          FilterExpression: args.filterExpression,
          ExpressionAttributeNames: args.names,
          ExpressionAttributeValues: args.values,
        });
      });
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
    attrs?: Record<string, DynamoDB.DocumentClient.AttributeName>;
    values?: Partial<Record<string, string | string[] | number>>;
    limit?: number;
  }): AsyncGenerator<T[], void, unknown> {
    const startTime = Date.now();
    let totalItems = 0;

    try {
      for await (const batch of streamingQuery<T>((key) => {
        return this.dynamo.query({
          TableName: args.tableName,
          IndexName: args.indexName,
          ExclusiveStartKey: key,
          ScanIndexForward: args.scanIndexForward,
          KeyConditionExpression: args.expression,
          FilterExpression: args.filterExpression,
          ExpressionAttributeNames: args.attrs,
          ExpressionAttributeValues: args.values,
          Limit: args.limit,
        });
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
    names?: Record<string, DynamoDB.DocumentClient.AttributeName>;
    values?: Partial<Record<string, number | string | string[]>>;
  }): AsyncGenerator<T[], void, unknown> {
    const startTime = Date.now();
    let totalItems = 0;

    try {
      for await (const batch of streamingQuery<T>((key) => {
        return this.dynamo.scan({
          TableName: args.tableName,
          ExclusiveStartKey: key,
          FilterExpression: args.filterExpression,
          ExpressionAttributeNames: args.names,
          ExpressionAttributeValues: args.values,
        });
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

  public async get<T>(args: { tableName: string; key: DynamoDB.DocumentClient.Key }): Promise<T | undefined> {
    const startTime = Date.now();
    try {
      const result = await this.dynamo
        .get({ TableName: args.tableName, Key: args.key })
        .promise()
        .then((r) => r.Item as T | undefined);
      this.log.log(`Dynamo get: ${args.tableName} - `, args.key, ` - ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      const e = error as Error;
      this.log.log(`FAILED Dynamo get: ${args.tableName} - `, args.key, ` - ${Date.now() - startTime}ms`);
      if ("code" in e && e.code === "ResourceNotFoundException") {
        return undefined;
      } else {
        throw e;
      }
    }
  }

  public async put(args: { tableName: string; item: DynamoDB.DocumentClient.PutItemInputAttributeMap }): Promise<void> {
    const startTime = Date.now();
    try {
      await this.dynamo.put({ TableName: args.tableName, Item: args.item }).promise();
    } catch (error) {
      const e = error as Error;
      this.log.log(`FAILED Dynamo put: ${args.tableName} - `, args.item, ` - ${Date.now() - startTime}ms`);
      this.log.log(e.message);
      this.log.log(e.stack);
      throw e;
    }
    this.log.log(`Dynamo put: ${args.tableName} - `, args.item, ` - ${Date.now() - startTime}ms`);
  }

  public async update(args: {
    tableName: string;
    key: DynamoDB.DocumentClient.Key;
    expression: string;
    attrs?: Record<string, DynamoDB.DocumentClient.AttributeName>;
    values?: Partial<Record<string, unknown>>;
  }): Promise<void> {
    const startTime = Date.now();
    try {
      await this.dynamo
        .update({
          TableName: args.tableName,
          Key: args.key,
          UpdateExpression: args.expression,
          ExpressionAttributeNames: args.attrs,
          ExpressionAttributeValues: args.values,
        })
        .promise();
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

  public async remove(args: { tableName: string; key: DynamoDB.DocumentClient.Key }): Promise<void> {
    const startTime = Date.now();
    try {
      await this.dynamo
        .delete({
          TableName: args.tableName,
          Key: args.key,
        })
        .promise();
    } catch (e) {
      this.log.log(`FAILED Dynamo delete: ${args.tableName} - `, args.key, ` - ${Date.now() - startTime}ms`);
      throw e;
    }
    this.log.log(`Dynamo delete: ${args.tableName} - `, args.key, ` - ${Date.now() - startTime}ms`);
  }

  public async batchGet<T>(args: { tableName: string; keys: DynamoDB.DocumentClient.Key[] }): Promise<T[]> {
    const startTime = Date.now();
    try {
      const result = await Promise.all(
        CollectionUtils.inGroupsOf(95, args.keys).map((group) => {
          return this.dynamo.batchGet({ RequestItems: { [args.tableName]: { Keys: group } } }).promise();
        })
      );
      this.log.log(`Dynamo batch get: ${args.tableName} - `, args.keys, ` - ${Date.now() - startTime}ms`);
      return CollectionUtils.compact(result.map((r) => r.Responses?.[args.tableName] || [])).flat() as T[];
    } catch (e) {
      this.log.log(`FAILED Dynamo batch get: ${args.tableName} - `, args.keys, ` - ${Date.now() - startTime}ms`);
      throw e;
    }
  }

  public async batchDelete(args: { tableName: string; keys: DynamoDB.DocumentClient.Key[] }): Promise<void> {
    if (args.keys.length === 0) {
      return;
    }
    await Promise.all(
      CollectionUtils.inGroupsOf(25, args.keys).map(async (group) => {
        const startTime = Date.now();
        try {
          await this.dynamo
            .batchWrite({
              RequestItems: {
                [args.tableName]: group.map((key) => ({
                  DeleteRequest: {
                    Key: key,
                  },
                })),
              },
            })
            .promise();
        } catch (e) {
          this.log.log(`FAILED Dynamo batch delete: ${args.tableName} - `, group, ` - ${Date.now() - startTime}ms`);
          throw e;
        }
        this.log.log(`Dynamo batch delete: ${args.tableName} - `, group, ` - ${Date.now() - startTime}ms`);
      })
    );
  }

  public async batchPut(args: {
    tableName: string;
    items: DynamoDB.DocumentClient.PutItemInputAttributeMap[];
  }): Promise<void> {
    if (args.items.length === 0) {
      return;
    }
    await Promise.all(
      CollectionUtils.inGroupsOf(25, args.items).map(async (group) => {
        const startTime = Date.now();
        try {
          await this.dynamo
            .batchWrite({
              RequestItems: {
                [args.tableName]: group.map((item) => ({
                  PutRequest: {
                    Item: item,
                  },
                })),
              },
            })
            .promise();
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

async function query<T>(
  cb: (key?: DynamoDB.DocumentClient.Key) => Request<DynamoDB.DocumentClient.QueryOutput, AWSError>,
  limit?: number
): Promise<T[]> {
  let key: DynamoDB.DocumentClient.Key | undefined;
  let items: DynamoDB.DocumentClient.ItemList = [];
  do {
    const result = await cb(key).promise();
    items = items.concat(result.Items || []);
    if (limit != null && items.length >= limit) {
      break;
    }
    key = result.LastEvaluatedKey;
  } while (key);
  return items as T[];
}

async function* streamingQuery<T>(
  cb: (key?: DynamoDB.DocumentClient.Key) => Request<DynamoDB.DocumentClient.QueryOutput, AWSError>,
  limit?: number
): AsyncGenerator<T[], void, unknown> {
  let key: DynamoDB.DocumentClient.Key | undefined;
  let totalItems = 0;

  do {
    const result = await cb(key).promise();
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
