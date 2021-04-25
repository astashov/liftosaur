import { IDI } from "../utils/di";

const tableNames = {
  dev: {
    googleAuthToken: "lftGoogleAuthKeysDev",
  },
  prod: {
    googleAuthToken: "lftGoogleAuthKeys",
  },
} as const;

export class GoogleAuthTokenDao {
  constructor(private readonly di: IDI) {}

  public async store(env: "dev" | "prod", token: string, googleId: string): Promise<void> {
    return this.di.dynamo.put({ tableName: tableNames[env].googleAuthToken, item: { token, googleId } });
  }
}
