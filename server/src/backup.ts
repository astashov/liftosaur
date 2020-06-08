import { CloudflareWorkerKV } from "types-cloudflare-worker";
import { CollectionUtils } from "./utils/collection";
import { DateUtils } from "./utils/date";
import { Backblaze } from "./backblaze";

export class Backup {
  constructor(private readonly kv: CloudflareWorkerKV, private readonly name: string) {}

  public async backup(): Promise<boolean> {
    const keys = await this.getKeys();
    const groupedKeys = CollectionUtils.inGroupsOf(50, keys);
    let all: Record<string, string | undefined> = {};
    for (const group of groupedKeys) {
      const arrResult = await Promise.all(
        group.map((key) =>
          this.kv.get(key).then<[string, string]>((r) => [key, r])
        )
      );
      const result = arrResult.reduce<Record<string, string | undefined>>((memo, [key, value]) => {
        memo[key] = value;
        return memo;
      }, {});
      all = { ...all, ...result };
    }
    return new Backblaze().upload(`${this.name}_${DateUtils.formatYYYYMMDDHHMM(Date.now())}.json`, all);
  }

  private async getKeys(): Promise<string[]> {
    let listComplete: boolean = false;
    let cursor: undefined | string;
    let allKeys: string[] = [];
    while (!listComplete) {
      const keys = await this.kv.list(undefined, undefined, cursor);
      listComplete = keys.list_complete;
      cursor = keys.cursor;
      allKeys = allKeys.concat(keys.keys.map((k) => k.name));
    }
    return allKeys;
  }
}
