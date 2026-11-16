import { Utils_getEnv } from "../utils";
import { IDI } from "../utils/di";

export const programEditTableNames = {
  dev: {
    programEdits: "lftUserProgramEditsDev",
    programEditsEditor: "lftUserProgramEditsEditorDev",
  },
  prod: {
    programEdits: "lftUserProgramEdits",
    programEditsEditor: "lftUserProgramEditsEditor",
  },
} as const;

const ttlSeconds = 90 * 24 * 60 * 60;

export interface IProgramEditDao {
  ownerId: string;
  id: string;
  programId: string;
  programName: string;
  editorId: string;
  revision: string;
  seen: boolean;
  createdAt: number;
  ttl: number;
}

export function ProgramEditDao_build(args: {
  ownerId: string;
  programId: string;
  programName: string;
  editorId: string;
  revision: string;
  now: number;
}): IProgramEditDao {
  return {
    ownerId: args.ownerId,
    id: `${args.now}#${args.programId}`,
    programId: args.programId,
    programName: args.programName,
    editorId: args.editorId,
    revision: args.revision,
    seen: false,
    createdAt: args.now,
    ttl: Math.floor(args.now / 1000) + ttlSeconds,
  };
}

export class ProgramEditDao {
  constructor(private readonly di: IDI) {}

  public async put(row: IProgramEditDao): Promise<void> {
    await this.di.dynamo.put({ tableName: programEditTableNames[Utils_getEnv()].programEdits, item: { ...row } });
  }

  public async listForOwner(ownerId: string, limit: number): Promise<IProgramEditDao[]> {
    const page = await this.di.dynamo.queryPage<IProgramEditDao>({
      tableName: programEditTableNames[Utils_getEnv()].programEdits,
      expression: "#ownerId = :ownerId",
      attrs: { "#ownerId": "ownerId" },
      values: { ":ownerId": ownerId },
      scanIndexForward: false,
      limit,
    });
    return page.items;
  }

  public async listForProgram(ownerId: string, programId: string, limit: number): Promise<IProgramEditDao[]> {
    const rows = await this.listForOwner(ownerId, 500);
    return rows.filter((r) => r.programId === programId).slice(0, limit);
  }

  public async markSeen(ownerId: string, ids: string[]): Promise<void> {
    const tableName = programEditTableNames[Utils_getEnv()].programEdits;
    await Promise.all(
      ids.map((id) =>
        this.di.dynamo.update({
          tableName,
          key: { ownerId, id },
          expression: "SET #seen = :seen",
          attrs: { "#seen": "seen" },
          values: { ":seen": true },
        })
      )
    );
  }

  public async removeAllForUser(userId: string): Promise<void> {
    const env = Utils_getEnv();
    const [owned, written] = await Promise.all([
      this.di.dynamo.query<IProgramEditDao>({
        tableName: programEditTableNames[env].programEdits,
        expression: "#ownerId = :ownerId",
        attrs: { "#ownerId": "ownerId" },
        values: { ":ownerId": userId },
      }),
      this.di.dynamo.query<IProgramEditDao>({
        tableName: programEditTableNames[env].programEdits,
        indexName: programEditTableNames[env].programEditsEditor,
        expression: "#editorId = :editorId",
        attrs: { "#editorId": "editorId" },
        values: { ":editorId": userId },
      }),
    ]);
    const keys = new Map<string, { ownerId: string; id: string }>();
    for (const row of [...owned, ...written]) {
      keys.set(`${row.ownerId}|${row.id}`, { ownerId: row.ownerId, id: row.id });
    }
    if (keys.size > 0) {
      await this.di.dynamo.batchDelete({
        tableName: programEditTableNames[env].programEdits,
        keys: Array.from(keys.values()),
      });
    }
  }
}
