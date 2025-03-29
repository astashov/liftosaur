import { runMigrations } from "../migrations/runner";
import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";
import { getLatestMigrationVersion } from "../migrations/migrations";
import { UidFactory } from "../utils/generator";
import { TStorage, IStorage, IPartialStorage } from "../types";
import { Settings } from "../models/settings";
import { IEither } from "../utils/types";
import RB from "rollbar";
import { IState, updateState } from "./state";
import { lb } from "lens-shmens";
import { IDispatch } from "../ducks/types";
import { CollectionUtils } from "../utils/collection";
import { ObjectUtils } from "../utils/object";
import { DateUtils } from "../utils/date";
import { IStorageUpdate } from "../utils/sync";

declare let Rollbar: RB;

export namespace Storage {
  export function validate(
    data: Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: t.Type<any, any, any>,
    name: string
  ): IEither<IStorage, string[]> {
    const decoded = type.decode(data);
    if ("left" in decoded) {
      const error = PathReporter.report(decoded);
      return { success: false, error };
    } else {
      return { success: true, data: decoded.right };
    }
  }

  export function validateStorage(data: Record<string, unknown>): IEither<IStorage, string[]> {
    return validate(data, TStorage, "storage");
  }

  export function validateAndReportStorage(data: Record<string, unknown>): IEither<IStorage, string[]> {
    return validateAndReport(data, TStorage, "storage");
  }

  export function validateAndReport(
    data: Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: t.Type<any, any, any>,
    name: string
  ): IEither<IStorage, string[]> {
    const result = validate(data, type, name);
    if (!result.success) {
      const error = result.error;
      if (Rollbar != null) {
        Rollbar.error(error.join("\n"), { state: JSON.stringify(data), type: name });
      }
      console.error(`Error decoding ${name}`);
      console.log(data);
      error.forEach((e) => console.error(e));
    }
    return result;
  }

  export async function get(
    client: Window["fetch"],
    maybeStorage?: Record<string, unknown>,
    shouldReportError?: boolean
  ): Promise<IEither<IStorage, string[]>> {
    if (maybeStorage) {
      let finalStorage = await runMigrations(client, maybeStorage as IStorage);
      const firstValidateResult = validate(finalStorage, TStorage, "storage");
      if (!firstValidateResult.success) {
        maybeStorage.version = "20230612190339";
        finalStorage = await runMigrations(client, maybeStorage as IStorage);
      }
      const result = shouldReportError
        ? validateAndReport(finalStorage, TStorage, "storage")
        : validate(finalStorage, TStorage, "storage");
      return result;
    } else {
      return { success: false, error: ["Provided data is empty"] };
    }
  }

  export function getDefault(): IStorage {
    const dateNow = Date.now();
    return {
      id: dateNow,
      originalId: dateNow,
      currentProgramId: undefined,
      reviewRequests: [],
      signupRequests: [],
      deletedHistory: [],
      deletedPrograms: [],
      deletedStats: [],
      tempUserId: UidFactory.generateUid(10),
      affiliates: {},
      stats: {
        weight: { weight: [] },
        length: {
          neck: [],
          shoulders: [],
          bicepLeft: [],
          bicepRight: [],
          forearmLeft: [],
          forearmRight: [],
          chest: [],
          waist: [],
          hips: [],
          thighLeft: [],
          thighRight: [],
          calfLeft: [],
          calfRight: [],
        },
        percentage: { bodyfat: [] },
      },
      settings: Settings.build(),
      history: [],
      version: getLatestMigrationVersion(),
      subscription: { apple: {}, google: {} },
      programs: [],
      helps: [],
      email: undefined,
      whatsNew: DateUtils.formatYYYYMMDD(Date.now(), ""),
    };
  }

  export function setAffiliate(dispatch: IDispatch, source?: string): void {
    if (source) {
      updateState(dispatch, [
        lb<IState>()
          .p("storage")
          .p("affiliates")
          .recordModify((affiliates) => ({ [source]: Date.now(), ...affiliates })),
      ]);
    }
  }

  export function isChanged(aStorage: IStorage, bStorage: IStorage): boolean {
    const { originalId: _aOriginalId, id: _aId, ...cleanedAStorage } = aStorage;
    const { originalId: _bOriginalId, id: _bId, ...cleanedBStorage } = bStorage;
    const changed = !ObjectUtils.isEqual(cleanedAStorage, cleanedBStorage, ["diffPaths", "version"]);
    return changed;
  }

  export function isFullStorage(storage: IStorage | IPartialStorage): storage is IStorage {
    return storage.programs != null && storage.history != null && storage.stats != null;
  }

  export function partialStorageToStorage(partialStorage: IPartialStorage): IStorage {
    if (partialStorage.history != null && partialStorage.programs != null && partialStorage.stats != null) {
      return partialStorage as IStorage;
    } else {
      return {
        ...partialStorage,
        history: partialStorage.history || [],
        programs: partialStorage.programs || [],
        stats: partialStorage.stats || {
          length: {},
          percentage: {},
          weight: {},
        },
      };
    }
  }

  export function applyUpdate(storage: IPartialStorage, updateWithStats: IStorageUpdate): IPartialStorage {
    const { stats, ...update } = updateWithStats;

    const deletedGyms = new Set([...storage.settings.deletedGyms, ...(update.settings?.deletedGyms || [])]);
    const lastGyms = CollectionUtils.groupByKeyUniq(storage.settings.gyms || [], "id");
    const newGyms = CollectionUtils.groupByKeyUniq(update.settings?.gyms || [], "id");
    const gymsObj = { ...lastGyms, ...newGyms };
    const gymsArr = CollectionUtils.compact(ObjectUtils.values(gymsObj)).filter((g) => !deletedGyms.has(g.id));

    const deletedHistory = Array.from(new Set([...storage.deletedHistory, ...(update.deletedHistory || [])]));
    const deletedPrograms = Array.from(new Set([...storage.deletedPrograms, ...(update.deletedPrograms || [])]));
    const deletedStats = Array.from(new Set([...storage.deletedStats, ...(update.deletedStats || [])]));

    const reviewRequests = Array.from(new Set([...storage.reviewRequests, ...(update.reviewRequests || [])]));
    const signupRequests = Array.from(new Set([...storage.signupRequests, ...(update.signupRequests || [])]));
    const helps = Array.from(new Set([...storage.helps, ...(update.helps || [])]));

    const exercises = { ...storage.settings.exercises, ...(update.settings?.exercises || {}) };
    const exerciseData = { ...storage.settings.exerciseData, ...(update.settings?.exerciseData || {}) };

    const newStorage: IPartialStorage = {
      ...storage,
      ...update,
      deletedHistory,
      deletedPrograms,
      deletedStats,
      reviewRequests,
      signupRequests,
      helps,
      settings: {
        ...storage.settings,
        ...update.settings,
        exercises,
        exerciseData,
        gyms: gymsArr,
      },
    };
    return newStorage;
  }
}
