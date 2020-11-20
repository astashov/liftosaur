import { CollectionUtils } from "../../../src/utils/collection";
import { CloudflareWorkerKV } from "types-cloudflare-worker";
import { IStorage } from "../../../src/models/state";

declare let kv_liftosaur_users: CloudflareWorkerKV;

interface IUserPayload {
  storage: IStorage;
  id: string;
  email: string;
}

export namespace UserModel {
  export async function getAll(): Promise<IUserPayload[]> {
    const keys = (await kv_liftosaur_users.list()).keys;
    const groups = CollectionUtils.inGroupsOf(100, keys);
    let users: IUserPayload[] = [];
    for (const group of groups) {
      users = users.concat(await Promise.all(group.map((key) => kv_liftosaur_users.get(key.name, "json"))));
    }
    return users;
  }
}
