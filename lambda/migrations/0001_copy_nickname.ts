// import { Utils } from "../utils";
import { ILimitedUserDao, userTableNames } from "../dao/userDao";
import { buildDi } from "../utils/di";
import { LogUtil } from "../utils/log";

async function main(): Promise<void> {
  const env = "dev"; // Utils.getEnv();
  const di = buildDi(new LogUtil());
  const allUsers = await di.dynamo.scan<ILimitedUserDao>({ tableName: userTableNames[env].users });
  for (const user of allUsers) {
    user.nickname = user.storage.settings.nickname?.toLowerCase();
    await di.dynamo.put({ tableName: userTableNames[env].users, item: user });
  }
}

main();
