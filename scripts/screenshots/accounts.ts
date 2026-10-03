import * as fs from "fs";
import * as path from "path";
import fetch from "node-fetch";
import { UserDao } from "../../lambda/dao/userDao";
import { FreeUserDao } from "../../lambda/dao/freeUserDao";
import { buildDi } from "../../lambda/utils/di";
import { ILogUtil } from "../../lambda/utils/log";
import { PasswordHash_hash } from "../../lambda/utils/passwordHash";
import { IStorage } from "../../src/types";
import {
  ScreenshotsAccountStorage_build,
  ScreenshotsAccountStorage_email,
  ScreenshotsAccountStorage_id,
} from "./accountStorage";

const fixturePath = path.resolve(__dirname, "../../screenshots/fixtures/demo.json");
const fiftyYears = 1000 * 60 * 60 * 24 * 365 * 50;

export interface IScreenshotsAccounts {
  reset(simIndex: number): Promise<"created" | "reset">;
}

const quietLog: ILogUtil = { id: "screenshots", log: () => undefined, setUser: () => undefined };

export function ScreenshotsAccounts_open(password: string): IScreenshotsAccounts {
  const fixture: IStorage = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const di = buildDi(quietLog, fetch);
  const userDao = new UserDao(di);
  const freeUserDao = new FreeUserDao(di);
  return {
    reset: async (simIndex) => {
      const id = ScreenshotsAccountStorage_id(simIndex);
      const email = ScreenshotsAccountStorage_email(simIndex);
      const existing = await userDao.getById(id);
      const row =
        existing ??
        UserDao.build(id, email, { passwordHash: await PasswordHash_hash(password), emailVerifiedAt: Date.now() });
      const key =
        existing?.storage.subscription.key ?? (await freeUserDao.create(id, Date.now() + fiftyYears, true)).key;
      const storage = ScreenshotsAccountStorage_build(fixture, { id, email, key, now: Date.now() });
      if (existing == null) {
        await userDao.create(row);
      }
      await userDao.saveStorage(row, storage, "script_screenshots_accounts");
      return existing == null ? "created" : "reset";
    },
  };
}

async function main(): Promise<void> {
  const count = parseInt(process.argv[2] || "", 10);
  const password = process.argv[3];
  if (!(count > 0) || !password) {
    console.log("usage: TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/screenshots/accounts.ts <count> <password>");
    process.exit(1);
  }
  const accounts = ScreenshotsAccounts_open(password);
  for (let i = 0; i < count; i++) {
    const outcome = await accounts.reset(i);
    console.log(ScreenshotsAccountStorage_id(i), ScreenshotsAccountStorage_email(i), outcome);
  }
}

if (require.main === module) {
  main();
}
