import { IDI } from "../utils/di";

const tableNames = {
  dev: {
    appleAuthToken: "lftAppleAuthKeysDev",
  },
  prod: {
    appleAuthToken: "lftAppleAuthKeys",
  },
} as const;

export class AppleAuthTokenDao {
  constructor(private readonly di: IDI) {}

  public async store(env: "dev" | "prod", token: string, appleId: string): Promise<void> {
    return this.di.dynamo.put({ tableName: tableNames[env].appleAuthToken, item: { token, appleId } });
  }
}
