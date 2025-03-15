import { IEventPayload } from "../../src/api/service";
import { DateUtils } from "../../src/utils/date";
import { IStorageUpdate } from "../../src/utils/sync";
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

  public static prepareStorageUpdateForEvent(storageUpdate: IStorageUpdate): string {
    const preparedStorageUpdate: any = { ...storageUpdate };
    preparedStorageUpdate.history = storageUpdate.history?.map((h) => {
      return {
        date: h.date,
        programName: h.programName,
        dayName: h.dayName,
        numEntries: h.entries.length,
        numSets: h.entries.reduce((acc, e) => acc + e.sets.length, 0),
        startTime: DateUtils.formatYYYYMMDDHHMM(h.startTime),
        endTime: h.endTime ? DateUtils.formatYYYYMMDDHHMM(h.endTime) : undefined,
      };
    });
    preparedStorageUpdate.programs = storageUpdate.programs?.map((p) => {
      return {
        name: p.name,
        numWeeks: p.planner?.weeks.length,
        numDays: p.planner?.weeks.reduce((acc, w) => acc + w.days.length, 0),
      };
    });
    return JSON.stringify(preparedStorageUpdate);
  }

  public async post(event: IEventPayload): Promise<void> {
    try {
      const env = Utils.getEnv();
      await this.di.dynamo.put({
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
