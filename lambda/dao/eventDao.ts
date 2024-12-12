import { IEventPayload } from "../../src/api/service";
import { Utils } from "../utils";
import { IDI } from "../utils/di";

export const eventsTableNames = {
  dev: {
    events: "lftEventsDev",
  },
  prod: {
    events: "lftEvents",
  },
} as const;

export class EventDao {
  constructor(private readonly di: IDI) {}

  public async post(event: IEventPayload): Promise<void> {
    try {
      const env = Utils.getEnv();
      return this.di.dynamo.put({
        tableName: eventsTableNames[env].events,
        item: { ...event, ttl: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14 },
      });
    } catch (e) {
      console.error("Error posting event", e);
    }
  }

  public getByUserId(userid: string): Promise<IEventPayload[]> {
    const env = Utils.getEnv();
    return this.di.dynamo.query<IEventPayload>({
      tableName: eventsTableNames[env].events,
      expression: "#userId = :userid",
      attrs: { "#userId": "userId" },
      values: { ":userid": userid },
    });
  }
}
