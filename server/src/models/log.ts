import { CollectionUtils } from "../../../src/utils/collection";
import { CloudflareWorkerKV } from "types-cloudflare-worker";

declare let kv_liftosaur_logs: CloudflareWorkerKV;

export interface ILog {
  action: string;
  count: number;
  timestamp: number;
}

export interface ILogPayload {
  logs: ILog[];
  email?: string;
}

export type ILogPayloads = Partial<Record<string, ILogPayload>>;

export namespace LogModel {
  export async function getAll(): Promise<ILogPayloads> {
    const keys = (await kv_liftosaur_logs.list()).keys;
    const groups = CollectionUtils.inGroupsOf(100, keys);
    const userLogs: ILogPayloads = {};
    for (const group of groups) {
      await Promise.all(
        group.map(async (key) => {
          const value = await kv_liftosaur_logs.get(key.name, "json");
          const [userId, action] = key.name.split(":");
          userLogs[userId] = userLogs[userId] || { logs: [] };
          userLogs[userId]!.logs.push({ action, count: value.value, timestamp: value.ts });
        })
      );
    }
    return userLogs;
  }
}
