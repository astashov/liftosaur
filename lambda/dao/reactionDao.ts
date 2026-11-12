import { Utils_getEnv } from "../utils";
import { IDI } from "../utils/di";
import { IReactionRow } from "../../src/models/reactions";
import { CollectionUtils_flat } from "../../src/utils/collection";
import { Concurrency_runWithLimit } from "../../src/utils/concurrency";

const reactionQueryConcurrency = 10;

export const reactionTableNames = {
  dev: {
    reactions: "lftReactionsDev",
    reactionsReactorId: "lftReactionsReactorIdDev",
  },
  prod: {
    reactions: "lftReactions",
    reactionsReactorId: "lftReactionsReactorId",
  },
} as const;

export interface IReactionDao extends IReactionRow {
  target: string;
}

export interface IReactionTarget {
  ownerId: string;
  recordId: number;
}

function targetKey(ownerId: string, recordId: number): string {
  return `${ownerId}#${recordId}`;
}

function toRow(item: IReactionDao): IReactionRow {
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

  private async listForTarget(ownerId: string, recordId: number): Promise<IReactionDao[]> {
    return this.di.dynamo.query<IReactionDao>({
      tableName: reactionTableNames[Utils_getEnv()].reactions,
      expression: "#target = :target",
      attrs: { "#target": "target" },
      values: { ":target": targetKey(ownerId, recordId) },
    });
  }

  public async listForRecords(targets: IReactionTarget[]): Promise<IReactionRow[]> {
    const results = await Promise.all(targets.map((t) => this.listForTarget(t.ownerId, t.recordId)));
    return CollectionUtils_flat(results).map(toRow);
  }

  public async put(row: IReactionRow): Promise<void> {
    const item: IReactionDao = { ...row, target: targetKey(row.ownerId, row.recordId) };
    await this.di.dynamo.put({ tableName: reactionTableNames[Utils_getEnv()].reactions, item: { ...item } });
  }

  public async remove(ownerId: string, recordId: number, reactorId: string): Promise<void> {
    await this.di.dynamo.remove({
      tableName: reactionTableNames[Utils_getEnv()].reactions,
      key: { target: targetKey(ownerId, recordId), reactorId },
    });
  }

  public async removeForRecords(ownerId: string, recordIds: number[]): Promise<void> {
    if (recordIds.length === 0) {
      return;
    }
    const lists = await Concurrency_runWithLimit(
      recordIds.map((id) => () => this.listForTarget(ownerId, id)),
      reactionQueryConcurrency
    );
    const items = CollectionUtils_flat(lists);
    if (items.length > 0) {
      await this.di.dynamo.batchDelete({
        tableName: reactionTableNames[Utils_getEnv()].reactions,
        keys: items.map((i) => ({ target: i.target, reactorId: i.reactorId })),
      });
    }
  }

  public async removeAllForUser(userId: string): Promise<void> {
    const env = Utils_getEnv();
    const given = await this.di.dynamo.query<IReactionDao>({
      tableName: reactionTableNames[env].reactions,
      indexName: reactionTableNames[env].reactionsReactorId,
      expression: "#reactorId = :reactorId",
      attrs: { "#reactorId": "reactorId" },
      values: { ":reactorId": userId },
    });
    if (given.length > 0) {
      await this.di.dynamo.batchDelete({
        tableName: reactionTableNames[env].reactions,
        keys: given.map((i) => ({ target: i.target, reactorId: i.reactorId })),
      });
    }
  }
}
