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
  BatchGetCommandInput,
  BatchWriteCommand,
  BatchWriteCommandInput,
  NativeAttributeValue,
} from "@aws-sdk/lib-dynamodb";
import { CollectionUtils_inGroupsOf, CollectionUtils_compact } from "../../src/utils/collection";
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
    returnValues?: "ALL_NEW" | "UPDATED_NEW";
  }): Promise<Record<string, NativeAttributeValue> | undefined>;
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
    const clampedPaths: string[] = [];
    const item = DynamoUtil_sanitizeNumbers(args.item, clampedPaths);
    if (clampedPaths.length > 0) {
      this.log.log(`Dynamo put: clamped out-of-range numbers in ${args.tableName}: `, clampedPaths);
    }
    try {
      await this.dynamo.send(new PutCommand({ TableName: args.tableName, Item: item }));
    } catch (error) {
      const e = error as Error;
      this.log.log(
        `FAILED Dynamo put: ${args.tableName} - `,
        DynamoUtil_redactForLog(args.item),
        ` - ${Date.now() - startTime}ms`
      );
      this.log.log(e.message);
      this.log.log(e.stack);
      throw e;
    }
    this.log.log(
      `Dynamo put: ${args.tableName} - `,
      DynamoUtil_redactForLog(args.item),
      ` - ${Date.now() - startTime}ms`
    );
  }

  public async putIfNotExists(args: {
    tableName: string;
    item: Record<string, NativeAttributeValue>;
    partitionKey: string;
    sortKey?: string;
  }): Promise<boolean> {
    const startTime = Date.now();
    const clampedPaths: string[] = [];
    const item = DynamoUtil_sanitizeNumbers(args.item, clampedPaths);
    if (clampedPaths.length > 0) {
      this.log.log(`Dynamo putIfNotExists: clamped out-of-range numbers in ${args.tableName}: `, clampedPaths);
    }
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
          Item: item,
          ConditionExpression: conditionExpression,
          ExpressionAttributeNames: expressionAttributeNames,
        })
      );

      this.log.log(
        `Dynamo putIfNotExists (inserted): ${args.tableName} - `,
        DynamoUtil_redactForLog(args.item),
        ` - ${Date.now() - startTime}ms`
      );
      return true;
    } catch (error) {
      const e = error as Error & { name?: string };
      if (e.name === "ConditionalCheckFailedException") {
        this.log.log(
          `Dynamo putIfNotExists (already exists): ${args.tableName} - `,
          DynamoUtil_redactForLog(args.item),
          ` - ${Date.now() - startTime}ms`
        );
        return false;
      }
      this.log.log(
        `FAILED Dynamo putIfNotExists: ${args.tableName} - `,
        DynamoUtil_redactForLog(args.item),
        ` - ${Date.now() - startTime}ms`
      );
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
    returnValues?: "ALL_NEW" | "UPDATED_NEW";
  }): Promise<Record<string, NativeAttributeValue> | undefined> {
    const startTime = Date.now();
    const clampedPaths: string[] = [];
    const values = DynamoUtil_sanitizeNumbers(args.values, clampedPaths);
    if (clampedPaths.length > 0) {
      this.log.log(`Dynamo update: clamped out-of-range numbers in ${args.tableName}: `, clampedPaths);
    }
    let attributes: Record<string, NativeAttributeValue> | undefined;
    try {
      const res = await this.dynamo.send(
        new UpdateCommand({
          TableName: args.tableName,
          Key: args.key,
          UpdateExpression: args.expression,
          ExpressionAttributeNames: args.attrs,
          ExpressionAttributeValues: values,
          ReturnValues: args.returnValues,
        })
      );
      attributes = res.Attributes;
    } catch (e) {
      this.log.log(
        `FAILED Dynamo update: ${args.tableName} - `,
        args.key,
        args.expression,
        DynamoUtil_redactForLog(args.values),
        ` - ${Date.now() - startTime}ms`
      );
      throw e;
    }
    this.log.log(
      `Dynamo update: ${args.tableName} - `,
      args.key,
      args.expression,
      DynamoUtil_redactForLog(args.values),
      ` - ${Date.now() - startTime}ms`
    );
    return attributes;
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

  // DynamoDB BatchWriteItem can succeed (HTTP 200) while leaving some items unwritten in
  // `UnprocessedItems` (e.g. under throttling) - the SDK does NOT auto-retry those. Re-send only
  // the leftovers with exponential backoff, and throw if they can't be drained so callers never
  // silently lose writes.
  private async sendBatchWriteWithRetry(
    requestItems: NonNullable<BatchWriteCommandInput["RequestItems"]>,
    context: string
  ): Promise<void> {
    const countRequests = (items: NonNullable<BatchWriteCommandInput["RequestItems"]>): number =>
      Object.keys(items).reduce((sum, table) => sum + (items[table]?.length ?? 0), 0);

    let pending = requestItems;
    for (let attempt = 0; attempt < BATCH_MAX_ATTEMPTS; attempt += 1) {
      const result = await this.dynamo.send(new BatchWriteCommand({ RequestItems: pending }));
      const unprocessed = (result.UnprocessedItems ?? {}) as NonNullable<BatchWriteCommandInput["RequestItems"]>;
      if (countRequests(unprocessed) === 0) {
        return;
      }
      pending = unprocessed;
      this.log.log(
        `Dynamo batch write retry: ${context} - ${countRequests(pending)} unprocessed item(s), attempt ${attempt + 1}`
      );
      await new Promise((resolve) => setTimeout(resolve, batchBackoffMs(attempt)));
    }
    throw new Error(
      `Dynamo batch write (${context}) left ${countRequests(pending)} unprocessed item(s) after ${BATCH_MAX_ATTEMPTS} attempts`
    );
  }

  // Like sendBatchWriteWithRetry, but for reads: BatchGetItem can return some keys in
  // `UnprocessedKeys` (HTTP 200) under throttling, which would silently truncate results. Re-fetch
  // only those keys with backoff, accumulating responses, and throw if they can't be drained.
  private async sendBatchGetWithRetry(
    requestItems: NonNullable<BatchGetCommandInput["RequestItems"]>,
    context: string
  ): Promise<Record<string, Record<string, NativeAttributeValue>[]>> {
    const countKeys = (items: NonNullable<BatchGetCommandInput["RequestItems"]>): number =>
      Object.keys(items).reduce((sum, table) => sum + (items[table]?.Keys?.length ?? 0), 0);

    const responses: Record<string, Record<string, NativeAttributeValue>[]> = {};
    let pending = requestItems;
    for (let attempt = 0; attempt < BATCH_MAX_ATTEMPTS; attempt += 1) {
      const result = await this.dynamo.send(new BatchGetCommand({ RequestItems: pending }));
      for (const table of Object.keys(result.Responses ?? {})) {
        responses[table] = (responses[table] ?? []).concat(result.Responses?.[table] ?? []);
      }
      const unprocessed = (result.UnprocessedKeys ?? {}) as NonNullable<BatchGetCommandInput["RequestItems"]>;
      if (countKeys(unprocessed) === 0) {
        return responses;
      }
      pending = unprocessed;
      this.log.log(
        `Dynamo batch get retry: ${context} - ${countKeys(pending)} unprocessed key(s), attempt ${attempt + 1}`
      );
      await new Promise((resolve) => setTimeout(resolve, batchBackoffMs(attempt)));
    }
    throw new Error(
      `Dynamo batch get (${context}) left ${countKeys(pending)} unprocessed key(s) after ${BATCH_MAX_ATTEMPTS} attempts`
    );
  }

  public async batchGet<T>(args: { tableName: string; keys: Record<string, NativeAttributeValue>[] }): Promise<T[]> {
    if (args.keys.length === 0) {
      return [];
    }
    const startTime = Date.now();
    try {
      const result = await Promise.all(
        CollectionUtils_inGroupsOf(95, args.keys).map((group) => {
          return this.sendBatchGetWithRetry({ [args.tableName]: { Keys: group } }, `get ${args.tableName}`);
        })
      );
      this.log.log(`Dynamo batch get: ${args.tableName} - `, args.keys, ` - ${Date.now() - startTime}ms`);
      return CollectionUtils_compact(result.map((r) => r[args.tableName] || [])).flat() as T[];
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
      CollectionUtils_inGroupsOf(25, args.keys).map(async (group) => {
        const startTime = Date.now();
        try {
          await this.sendBatchWriteWithRetry(
            { [args.tableName]: group.map((key) => ({ DeleteRequest: { Key: key } })) },
            `delete ${args.tableName}`
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
    const clampedPaths: string[] = [];
    const sanitizedItems = args.items.map((item) => DynamoUtil_sanitizeNumbers(item, clampedPaths));
    if (clampedPaths.length > 0) {
      this.log.log(`Dynamo batch put: clamped out-of-range numbers in ${args.tableName}: `, clampedPaths);
    }
    await Promise.all(
      CollectionUtils_inGroupsOf(25, sanitizedItems).map(async (group) => {
        const startTime = Date.now();
        try {
          await this.sendBatchWriteWithRetry(
            { [args.tableName]: group.map((item) => ({ PutRequest: { Item: item } })) },
            `put ${args.tableName}`
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
              group.map((item) => JSON.stringify(DynamoUtil_redactForLog(item)))
            );
          }
          if (e instanceof Error && e.message.includes("Item size has exceeded the maximum allowed size")) {
            try {
              const json = JSON.stringify(group);
              this.log.log(`batchPut payload length: ${json.length}`);
              for (let i = 0; i < group.length; i++) {
                const item = group[i];
                const jsonItem = JSON.stringify(DynamoUtil_redactForLog(item));
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

const BATCH_MAX_ATTEMPTS = 8;

// Exponential backoff with full jitter, capped at ~2s, so retries of throttled batch operations
// spread out instead of hammering the table in lockstep.
function batchBackoffMs(attempt: number): number {
  const ceiling = Math.min(2000, 50 * Math.pow(2, attempt));
  return Math.floor(Math.random() * ceiling);
}

const SENSITIVE_LOG_KEYS = new Set(["passwordHash"]);

// Replace sensitive fields (e.g. password hashes) with a placeholder before an
// item/values object is written to logs. Recursive so nested items are covered.
export function DynamoUtil_redactForLog<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => DynamoUtil_redactForLog(v)) as unknown as T;
  }
  if (value != null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = SENSITIVE_LOG_KEYS.has(k) ? "[redacted]" : DynamoUtil_redactForLog(v);
    }
    return result as unknown as T;
  }
  return value;
}

// The AWS SDK throws when marshalling a finite number outside the IEEE-safe integer range
// (or a NaN/Infinity), which would brick an entire write if a single corrupt value (e.g. a
// runaway equipment plate count) leaks into storage. Clamp such values so one bad number can't
// fail the whole put. We only descend into plain objects and arrays (the shapes our JSON storage
// uses); any other object is returned as-is so we don't mangle a value the DocumentClient marshals
// specially (e.g. a Set/Map into NS/SS or a typed array into binary).
export function DynamoUtil_sanitizeNumbers<T>(value: T, clampedPaths: string[] = [], path = ""): T {
  if (typeof value === "number") {
    if (Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) {
      return value;
    }
    clampedPaths.push(`${path || "<root>"}=${value}`);
    if (Number.isNaN(value)) {
      return 0 as unknown as T;
    }
    return (value > 0 ? Number.MAX_SAFE_INTEGER : -Number.MAX_SAFE_INTEGER) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v, i) => DynamoUtil_sanitizeNumbers(v, clampedPaths, `${path}[${i}]`)) as unknown as T;
  }
  if (value != null && typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      return value;
    }
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      result[key] = DynamoUtil_sanitizeNumbers(
        (value as Record<string, unknown>)[key],
        clampedPaths,
        path ? `${path}.${key}` : key
      );
    }
    return result as unknown as T;
  }
  return value;
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
