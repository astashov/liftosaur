import { createHash, randomBytes } from "crypto";
import { IDI } from "../utils/di";

const tableNames = {
  dev: {
    emailAuthTokens: "lftEmailAuthTokensDev",
  },
  prod: {
    emailAuthTokens: "lftEmailAuthTokens",
  },
} as const;

export type IEmailAuthTokenPayload = { type: "verify" | "reset"; userId: string };

type IEmailAuthTokenItem = IEmailAuthTokenPayload & { token: string; ttl: number };

const attemptsLimit = 10;
const attemptsWindowSeconds = 15 * 60;

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export class EmailAuthTokenDao {
  constructor(private readonly di: IDI) {}

  public async create(env: "dev" | "prod", payload: IEmailAuthTokenPayload, ttlSeconds: number): Promise<string> {
    const rawToken = randomBytes(32).toString("base64url");
    const item: IEmailAuthTokenItem = {
      ...payload,
      token: hashToken(rawToken),
      ttl: Math.floor(Date.now() / 1000) + ttlSeconds,
    };
    await this.di.dynamo.put({ tableName: tableNames[env].emailAuthTokens, item });
    return rawToken;
  }

  public async consume(
    env: "dev" | "prod",
    rawToken: string,
    types: IEmailAuthTokenPayload["type"][]
  ): Promise<IEmailAuthTokenPayload | undefined> {
    const token = hashToken(rawToken);
    const item = await this.di.dynamo.get<IEmailAuthTokenItem>({
      tableName: tableNames[env].emailAuthTokens,
      key: { token },
    });
    // DynamoDB TTL deletion can lag by up to 48h, so expiry must be checked on read
    if (item == null || item.ttl < Math.floor(Date.now() / 1000) || !types.includes(item.type)) {
      return undefined;
    }
    await this.di.dynamo.remove({ tableName: tableNames[env].emailAuthTokens, key: { token } });
    const { token: _, ttl: __, ...payload } = item;
    return payload;
  }

  public async bumpAttemptsAndCheckLimit(env: "dev" | "prod", email: string): Promise<boolean> {
    const key = `attempts:${email}`;
    const now = Math.floor(Date.now() / 1000);
    // Single atomic increment: parallel requests each get a distinct post-bump
    // count from ReturnValues, so a burst can't slip past on a stale read. ttl is
    // pinned on the first bump of a window (if_not_exists), so the count reflects
    // exactly one window.
    const attrs = await this.di.dynamo.update({
      tableName: tableNames[env].emailAuthTokens,
      key: { token: key },
      expression: "ADD #count :one SET #ttl = if_not_exists(#ttl, :ttl)",
      attrs: { "#count": "count", "#ttl": "ttl" },
      values: { ":one": 1, ":ttl": now + attemptsWindowSeconds },
      returnValues: "ALL_NEW",
    });
    const count = (attrs?.count as number) ?? 1;
    const ttl = (attrs?.ttl as number) ?? now + attemptsWindowSeconds;
    // DynamoDB TTL deletion lags up to 48h, so a window can expire while its item
    // lingers. Reset it to a fresh window rather than counting on the stale one.
    // The rare double-reset race only under-counts (both write count=1), which is
    // acceptable for a limiter and self-corrects on the next bump.
    if (ttl < now) {
      await this.di.dynamo.put({
        tableName: tableNames[env].emailAuthTokens,
        item: { token: key, count: 1, ttl: now + attemptsWindowSeconds },
      });
      return false;
    }
    return count > attemptsLimit;
  }

  public async clearAttempts(env: "dev" | "prod", email: string): Promise<void> {
    await this.di.dynamo.remove({
      tableName: tableNames[env].emailAuthTokens,
      key: { token: `attempts:${email}` },
    });
  }
}
