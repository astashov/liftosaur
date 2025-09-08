import { UidFactory } from "../../src/utils/generator";
import { StringUtils } from "../../src/utils/string";
import { Utils } from "../utils";
import { IDI } from "../utils/di";

const tableNames = {
  dev: {
    urls: "lftUrlsDev",
  },
  prod: {
    urls: "lftUrls",
  },
} as const;

export interface IUrlDao {
  id: string;
  url: string;
  userId?: string;
}

export class UrlDao {
  constructor(private readonly di: IDI) {}

  public async get(id: string): Promise<string | undefined> {
    const env = Utils.getEnv();
    const result = await this.di.dynamo.get<IUrlDao>({ tableName: tableNames[env].urls, key: { id } });
    return result?.url;
  }

  public async put(url: string, userId?: string): Promise<string> {
    const env = Utils.getEnv();
    let id = StringUtils.hashString(url);
    let item = await this.di.dynamo.get<IUrlDao>({ tableName: tableNames[env].urls, key: { id } });
    if (item?.url === url) {
      return id;
    } else if (item != null) {
      do {
        id = UidFactory.generateUid(8);
        item = await this.di.dynamo.get<IUrlDao>({ tableName: tableNames[env].urls, key: { id } });
      } while (item != null);
    }
    await this.di.dynamo.put({ tableName: tableNames[env].urls, item: { id, url, userId } });
    return id;
  }
}
