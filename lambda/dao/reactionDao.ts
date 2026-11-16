import { Utils_getEnv } from "../utils";
import { IDI } from "../utils/di";
import { IReaction, IReactionRow } from "../../src/models/reactions";
import { CollectionUtils_compact, CollectionUtils_flat } from "../../src/utils/collection";

export const reactionTableNames = {
  dev: {
    reactions: "lftReactionsDev",
    reactionsReactorId: "lftReactionsReactorIdDev",
    reactionsOwnerRecord: "lftReactionsOwnerRecordDev",
  },
  prod: {
    reactions: "lftReactions",
    reactionsReactorId: "lftReactionsReactorId",
    reactionsOwnerRecord: "lftReactionsOwnerRecord",
  },
} as const;

export interface IReactionDao extends Omit<IReactionRow, "reaction"> {
  target: string;
  reaction?: IReaction;
}

export interface IReactionTarget {
  ownerId: string;
  recordId: number;
}

function targetKey(ownerId: string, recordId: number): string {
  return `${ownerId}#${recordId}`;
}

function toRow(item: IReactionDao): IReactionRow | undefined {
  if (item.reaction == null) {
    return undefined;
  }
  return {
    ownerId: item.ownerId,
    recordId: item.recordId,
    reactorId: item.reactorId,
    reaction: item.reaction,
    createdAt: item.createdAt,
  };
}

export class ReactionDao {
  constructor(private readonly di: IDI) {}

  private async listForTarget(ownerId: string, recordId: number, consistentRead?: boolean): Promise<IReactionDao[]> {
    return this.di.dynamo.query<IReactionDao>({
      tableName: reactionTableNames[Utils_getEnv()].reactions,
      expression: "#target = :target",
      attrs: { "#target": "target" },
      values: { ":target": targetKey(ownerId, recordId) },
      consistentRead,
    });
  }

  public async listForRecords(
    targets: IReactionTarget[],
    args?: { consistentRead?: boolean }
  ): Promise<IReactionRow[]> {
    const results = await Promise.all(
      targets.map((t) => this.listForTarget(t.ownerId, t.recordId, args?.consistentRead))
    );
    return CollectionUtils_compact(CollectionUtils_flat(results).map(toRow));
  }

  public async listForOwnerRecords(ownerId: string, recordIds: number[]): Promise<IReactionRow[]> {
    if (recordIds.length === 0) {
      return [];
    }
    const env = Utils_getEnv();
    const ids = new Set(recordIds);
    const items = await this.di.dynamo.query<IReactionDao>({
      tableName: reactionTableNames[env].reactions,
      indexName: reactionTableNames[env].reactionsOwnerRecord,
      expression: "#ownerId = :ownerId AND #recordId BETWEEN :from AND :to",
      attrs: { "#ownerId": "ownerId", "#recordId": "recordId" },
      values: { ":ownerId": ownerId, ":from": Math.min(...recordIds), ":to": Math.max(...recordIds) },
    });
    return CollectionUtils_compact(items.filter((item) => ids.has(item.recordId)).map(toRow));
  }

  public async listForOwnerSince(ownerId: string, sinceRecordId: number): Promise<IReactionRow[]> {
    const env = Utils_getEnv();
    const items = await this.di.dynamo.query<IReactionDao>({
      tableName: reactionTableNames[env].reactions,
      indexName: reactionTableNames[env].reactionsOwnerRecord,
      expression: "#ownerId = :ownerId AND #recordId >= :since",
      attrs: { "#ownerId": "ownerId", "#recordId": "recordId" },
      values: { ":ownerId": ownerId, ":since": sinceRecordId },
    });
    return CollectionUtils_compact(items.map(toRow));
  }

  public async put(row: IReactionRow): Promise<{ isNew: boolean }> {
    const item: IReactionDao = { ...row, target: targetKey(row.ownerId, row.recordId) };
    const old = await this.di.dynamo.putReturningOld({
      tableName: reactionTableNames[Utils_getEnv()].reactions,
      item: { ...item },
    });
    return { isNew: old == null };
  }

  public async remove(
    ownerId: string,
    recordId: number,
    reactorId: string,
    now: number = Date.now()
  ): Promise<boolean> {
    const tombstone: IReactionDao = {
      target: targetKey(ownerId, recordId),
      ownerId,
      recordId,
      reactorId,
      createdAt: now,
    };
    return this.di.dynamo.transactWrite({
      puts: [
        {
          tableName: reactionTableNames[Utils_getEnv()].reactions,
          item: { ...tombstone },
          condition: { expression: "attribute_exists(#reaction)", attrs: { "#reaction": "reaction" } },
        },
      ],
    });
  }

  public async removeAllForUser(userId: string): Promise<void> {
    const env = Utils_getEnv();
    const [given, received] = await Promise.all([
      this.di.dynamo.query<IReactionDao>({
        tableName: reactionTableNames[env].reactions,
        indexName: reactionTableNames[env].reactionsReactorId,
        expression: "#reactorId = :reactorId",
        attrs: { "#reactorId": "reactorId" },
        values: { ":reactorId": userId },
      }),
      this.di.dynamo.query<IReactionDao>({
        tableName: reactionTableNames[env].reactions,
        indexName: reactionTableNames[env].reactionsOwnerRecord,
        expression: "#ownerId = :ownerId",
        attrs: { "#ownerId": "ownerId" },
        values: { ":ownerId": userId },
      }),
    ]);
    const keys = new Map<string, { target: string; reactorId: string }>();
    for (const item of [...given, ...received]) {
      keys.set(`${item.target}|${item.reactorId}`, { target: item.target, reactorId: item.reactorId });
    }
    if (keys.size > 0) {
      await this.di.dynamo.batchDelete({
        tableName: reactionTableNames[env].reactions,
        keys: Array.from(keys.values()),
      });
    }
  }
}
