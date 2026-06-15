import { NativeAttributeValue } from "@aws-sdk/lib-dynamodb";
import { IDynamoUtil } from "../../lambda/utils/dynamo";
import { ILogUtil } from "../../lambda/utils/log";
import deepmerge from "deepmerge";
import { userTableNames } from "../../lambda/dao/userDao";
import { apiKeyTableNames } from "../../lambda/dao/apiKeyDao";
import { oauthTableNames } from "../../lambda/dao/oauthDao";
import { freeUsersTableNames } from "../../lambda/dao/freeUserDao";
import { CollectionUtils_compact } from "../../src/utils/collection";
import { ObjectUtils_entries, ObjectUtils_values, ObjectUtils_clone } from "../../src/utils/object";

const idKeys: Partial<Record<string, string[]>> = {
  [userTableNames.prod.users]: ["id"],
  [userTableNames.prod.events]: ["userId", "timestamp"],
  [userTableNames.prod.historyRecords]: ["userId", "id"],
  [userTableNames.prod.programs]: ["userId", "id"],
  [userTableNames.prod.stats]: ["userId", "name"],
  [apiKeyTableNames.prod.apiKeys]: ["key"],
  [oauthTableNames.prod.clients]: ["clientId"],
  [oauthTableNames.prod.authCodes]: ["code"],
  [oauthTableNames.prod.tokens]: ["token"],
  [freeUsersTableNames.prod.freeUsers]: ["id"],
  lftSubscriptionDetails: ["userId"],
  lftPayments: ["userId", "transactionId"],
};

// Sort key used to order results when a query passes scanIndexForward. GSIs sort by a different attribute
// than their base table, so they're listed explicitly here.
const indexSortKeys: Partial<Record<string, string>> = {
  [userTableNames.prod.statsTimestamp]: "timestamp",
  [userTableNames.prod.historyRecordsDate]: "date",
};

function compareValues(a: unknown, b: unknown): number {
  const an = typeof a === "number" ? a : Number(a);
  const bn = typeof b === "number" ? b : Number(b);
  if (!isNaN(an) && !isNaN(bn) && `${a}`.trim() !== "" && `${b}`.trim() !== "") {
    return an - bn;
  }
  return `${a}`.localeCompare(`${b}`);
}

export class MockDynamoUtil implements IDynamoUtil {
  public data: Record<string, Record<string, unknown>> = {};

  constructor(public readonly log: ILogUtil) {}

  public addMockData<T>(newData: Record<string, Record<string, T>>): void {
    this.data = deepmerge(this.data, newData);
  }

  private buildCondition<T>(args: {
    filterExpression: string;
    attrs?: Record<string, string>;
    values?: Partial<Record<string, string | string[] | number | number[]>>;
  }): (item: T) => boolean {
    let expression = args.filterExpression;
    for (const [k, v] of ObjectUtils_entries(args.attrs || {})) {
      expression = expression.replace(new RegExp(k, "g"), v);
    }
    for (const [k, v] of ObjectUtils_entries(args.values || {})) {
      const value = Array.isArray(v) ? `IN (${v.map((x) => `${x}`).join(",")})` : `${v}`;
      expression = expression.replace(new RegExp(k, "g"), value);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clauses: ((item: any) => boolean)[] = [];
    let expr = expression;

    expr = expr.replace(/([\w.]+)\s+BETWEEN\s+(\S+)\s+AND\s+(\S+)/gi, (_m, field: string, a: string, b: string) => {
      clauses.push((item) => compareValues(item[field], a) >= 0 && compareValues(item[field], b) <= 0);
      return "";
    });
    expr = expr.replace(/contains\(\s*([\w.]+)\s*,\s*([^)]+?)\s*\)/gi, (_m, field: string, val: string) => {
      clauses.push((item) => typeof item[field] === "string" && item[field].includes(val));
      return "";
    });
    expr = expr.replace(/begins_with\(\s*([\w.]+)\s*,\s*([^)]+?)\s*\)/gi, (_m, field: string, val: string) => {
      clauses.push((item) => typeof item[field] === "string" && item[field].startsWith(val));
      return "";
    });

    for (const part of expr.split(/\s+AND\s+/i)) {
      const trimmed = part.trim();
      if (!trimmed) {
        continue;
      }
      const inMatch = trimmed.match(/^([\w.]+)\s+IN\s+\(([^)]*)\)$/i);
      if (inMatch) {
        const field = inMatch[1];
        const options = inMatch[2].split(",").map((s) => s.trim());

        clauses.push((item) => options.some((o) => `${item[field]}` === o));
        continue;
      }
      const opMatch = trimmed.match(/^([\w.]+)\s*(<=|>=|<>|=|<|>)\s*(.+)$/);
      if (opMatch) {
        const [, field, op, raw] = opMatch;
        const val = raw.trim();
        clauses.push((item) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const actual = (item as any)[field];
          const c = compareValues(actual, val);
          switch (op) {
            case "=":
              return `${actual}` === val;
            case "<>":
              return `${actual}` !== val;
            case "<":
              return c < 0;
            case "<=":
              return c <= 0;
            case ">":
              return c > 0;
            case ">=":
              return c >= 0;
            default:
              return true;
          }
        });
      }
      // Anything we don't recognize is left as match-all, preserving the mock's historical leniency.
    }

    return (item) => clauses.every((c) => c(item));
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
    let values = ObjectUtils_values(this.data[args.tableName] || {}) as unknown as T[];
    const keyCondition = this.buildCondition<T>({
      filterExpression: args.expression,
      attrs: args.attrs,
      values: args.values,
    });
    const filterCondition = args.filterExpression
      ? this.buildCondition<T>({ filterExpression: args.filterExpression, attrs: args.attrs, values: args.values })
      : () => true;
    values = values.filter((item) => keyCondition(item) && filterCondition(item));

    // Only GSI queries get ordered here (by the index's sort key). Base-table query order is left as-is to
    // match the mock's historical behavior — tests that care about base-table order assert insertion order.
    const sortKey = args.indexName ? indexSortKeys[args.indexName] : undefined;
    if (args.scanIndexForward !== undefined && sortKey) {
      values = [...values].sort((a, b) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = compareValues((a as any)[sortKey], (b as any)[sortKey]);
        return args.scanIndexForward ? c : -c;
      });
    }

    if (args.limit != null) {
      values = values.slice(0, args.limit);
    }

    return Promise.resolve(ObjectUtils_clone(values));
  }

  public async scan<T>(args: {
    tableName: string;
    filterExpression?: string;
    values?: Partial<Record<string, number | string | string[]>>;
  }): Promise<T[]> {
    let values = ObjectUtils_values(this.data[args.tableName] || {}) as T[];
    if (args.filterExpression) {
      values = values.filter(this.buildCondition({ filterExpression: args.filterExpression, values: args.values }));
    }
    return Promise.resolve(ObjectUtils_clone(values));
  }

  private getKey(key: Record<string, NativeAttributeValue>): string {
    const keys = Object.keys(key).sort();
    return JSON.stringify(key, keys);
  }

  public async get<T>(args: { tableName: string; key: Record<string, NativeAttributeValue> }): Promise<T | undefined> {
    const value = this.data[args.tableName]?.[this.getKey(args.key)] as T | undefined;
    return ObjectUtils_clone(value);
  }

  public async put(args: { tableName: string; item: Record<string, NativeAttributeValue> }): Promise<void> {
    const keyNames = idKeys[args.tableName];
    if (keyNames) {
      const key = keyNames.reduce((memo, k) => ({ ...memo, [k]: args.item[k] }), {});
      this.data[args.tableName] = this.data[args.tableName] || {};
      this.data[args.tableName][this.getKey(key)] = args.item;
    } else {
      throw new Error(`MockDynamo: Missing put key mapping for ${args.tableName}`);
    }
  }

  public putIfNotExists(args: {
    tableName: string;
    item: Record<string, NativeAttributeValue>;
    partitionKey: string;
    sortKey?: string;
  }): Promise<boolean> {
    const keyNames = idKeys[args.tableName];
    if (keyNames) {
      const key = keyNames.reduce((memo, k) => ({ ...memo, [k]: args.item[k] }), {});
      this.data[args.tableName] = this.data[args.tableName] || {};
      this.data[args.tableName][this.getKey(key)] = args.item;
      return Promise.resolve(true);
    } else {
      throw new Error(`MockDynamo: Missing put key mapping for ${args.tableName}`);
    }
  }

  public async update(args: {
    tableName: string;
    key: Record<string, NativeAttributeValue>;
    expression: string;
    attrs?: Record<string, string>;
    values?: Partial<Record<string, unknown>>;
  }): Promise<void> {
    // console.log("update", args);
  }

  public async remove(args: { tableName: string; key: Record<string, NativeAttributeValue> }): Promise<void> {
    const key = this.getKey(args.key);
    delete this.data[args.tableName]?.[key];
  }

  public async batchGet<T>(args: { tableName: string; keys: Record<string, NativeAttributeValue>[] }): Promise<T[]> {
    return CollectionUtils_compact(
      await Promise.all(args.keys.map((key) => this.get<T>({ tableName: args.tableName, key })))
    );
  }
  public async batchDelete(args: { tableName: string; keys: Record<string, NativeAttributeValue>[] }): Promise<void> {
    for (const key of args.keys) {
      await this.remove({ tableName: args.tableName, key });
    }
  }
  public async batchPut(args: { tableName: string; items: Record<string, NativeAttributeValue>[] }): Promise<void> {
    for (const item of args.items) {
      await this.put({ tableName: args.tableName, item });
    }
  }

  public async *streamingQuery<T>(args: {
    tableName: string;
    expression: string;
    filterExpression?: string;
    indexName?: string;
    scanIndexForward?: boolean;
    attrs?: Record<string, string>;
    values?: Partial<Record<string, string | string[] | number | number[]>>;
    limit?: number;
  }): AsyncGenerator<T[], void, unknown> {
    const values = ObjectUtils_values(this.data[args.tableName] || {}) as unknown as T[];
    const filteredValues = values.filter(
      this.buildCondition({ filterExpression: args.expression, attrs: args.attrs, values: args.values })
    );
    if (args.limit) {
      yield Promise.resolve(filteredValues.slice(0, args.limit));
    } else {
      yield Promise.resolve(filteredValues);
    }
  }

  public async *streamingScan<T>(args: {
    tableName: string;
    filterExpression?: string;
    values?: Partial<Record<string, number | string | string[]>>;
    limit?: number;
  }): AsyncGenerator<T[], void, unknown> {
    let values = ObjectUtils_values(this.data[args.tableName] || {}) as T[];
    if (args.filterExpression) {
      values = values.filter(this.buildCondition({ filterExpression: args.filterExpression, values: args.values }));
    }
    if (args.limit) {
      yield Promise.resolve(values.slice(0, args.limit));
    } else {
      yield Promise.resolve(values);
    }
  }
}
