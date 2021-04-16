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
    const dateNow = Date.now();
    return new Backblaze().upload(
      `${DateUtils.formatYYYYMMDD(dateNow, "_")}/${this.name}_${DateUtils.formatHHMMSS(dateNow, "_")}.json`,
      all
    );
  }

  public async getData(): Promise<Record<string, string | undefined>> {
    const keys = await this.getKeys();
    console.log("....got keys");
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
    return all;
  }

  private async getKeys(): Promise<string[]> {
    let listComplete: boolean = false;
    let cursor: undefined | string;
    let allKeys: string[] = [];
    while (!listComplete) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const keys = await this.kv.list({ cursor: cursor } as any);
      listComplete = keys.list_complete;
      cursor = keys.cursor;
      allKeys = allKeys.concat(keys.keys.map((k) => k.name));
    }
    return allKeys;
  }
}
