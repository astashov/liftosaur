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
import deepmerge from "deepmerge";
import { Equipment } from "./equipment";
import { ObjectUtils } from "../utils/object";
import { Program } from "./program";
import { DateUtils } from "../utils/date";

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
      const finalStorage = await runMigrations(client, maybeStorage as IStorage);
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

  export function updateIds(storage: IStorage | IPartialStorage): void {
    storage.originalId = storage.id;
    for (const program of storage.programs || []) {
      for (const exercise of program.exercises) {
        exercise.diffPaths = [];
      }
    }
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

  export function mergeStorage(
    oldStorage: IStorage,
    newStorage: IStorage,
    enforceNew: boolean = false,
    fields?: string[]
  ): IStorage {
    const deletedHistory = new Set([...oldStorage.deletedHistory, ...newStorage.deletedHistory]);
    const deletedStats = new Set([...oldStorage.deletedStats, ...newStorage.deletedStats]);
    const deletedPrograms = new Set([...oldStorage.deletedPrograms, ...newStorage.deletedPrograms]);

    function merge<T extends keyof IStorage>(key: T): IStorage[T] {
      return fields && fields.indexOf(key) === -1 ? oldStorage[key] : newStorage[key];
    }

    function merge2<T extends keyof IStorage, V extends keyof IStorage[T]>(key: T, key2: V): IStorage[T][V] {
      const k = `${key}.${key2}`;
      return fields && fields.indexOf(k) === -1 ? oldStorage[key][key2] : newStorage[key][key2];
    }

    function mergeAs<T extends keyof IStorage>(
      key: T,
      cb: (a: IStorage[T], b: IStorage[T]) => IStorage[T]
    ): IStorage[T] {
      return fields && fields.indexOf(key) === -1 ? oldStorage[key] : cb(oldStorage[key], newStorage[key]);
    }

    function mergeAs2<T extends keyof IStorage, V extends keyof IStorage[T]>(
      key: T,
      key2: V,
      cb: (a: IStorage[T][V], b: IStorage[T][V]) => IStorage[T][V]
    ): IStorage[T][V] {
      const k = `${key}.${key2}`;
      return fields && fields.indexOf(k) === -1
        ? oldStorage[key][key2]
        : cb(oldStorage[key][key2], newStorage[key][key2]);
    }

    const storage: IStorage = {
      ...oldStorage,
      ...newStorage,
      id: merge("id"),
      originalId: merge("originalId"),
      email: merge("email"),
      reviewRequests: merge("reviewRequests"),
      signupRequests: merge("signupRequests"),
      affiliates: merge("affiliates"),
      deletedHistory: Array.from(deletedHistory),
      deletedPrograms: Array.from(deletedPrograms),
      deletedStats: Array.from(deletedStats),
      stats: {
        weight: {
          weight: CollectionUtils.concatBy(
            oldStorage.stats.weight.weight || [],
            newStorage.stats.weight.weight || [],
            (el) => `${el.timestamp}`
          ).filter((el) => !deletedStats.has(el.timestamp)),
        },
        length: {
          neck: CollectionUtils.concatBy(
            oldStorage.stats.length.neck || [],
            newStorage.stats.length.neck || [],
            (el) => `${el.timestamp}`
          ).filter((el) => !deletedStats.has(el.timestamp)),
          shoulders: CollectionUtils.concatBy(
            oldStorage.stats.length.shoulders || [],
            newStorage.stats.length.shoulders || [],
            (el) => `${el.timestamp}`
          ).filter((el) => !deletedStats.has(el.timestamp)),
          bicepLeft: CollectionUtils.concatBy(
            oldStorage.stats.length.bicepLeft || [],
            newStorage.stats.length.bicepLeft || [],
            (el) => `${el.timestamp}`
          ).filter((el) => !deletedStats.has(el.timestamp)),
          bicepRight: CollectionUtils.concatBy(
            oldStorage.stats.length.bicepRight || [],
            newStorage.stats.length.bicepRight || [],
            (el) => `${el.timestamp}`
          ).filter((el) => !deletedStats.has(el.timestamp)),
          forearmLeft: CollectionUtils.concatBy(
            oldStorage.stats.length.forearmLeft || [],
            newStorage.stats.length.forearmLeft || [],
            (el) => `${el.timestamp}`
          ).filter((el) => !deletedStats.has(el.timestamp)),
          forearmRight: CollectionUtils.concatBy(
            oldStorage.stats.length.forearmRight || [],
            newStorage.stats.length.forearmRight || [],
            (el) => `${el.timestamp}`
          ).filter((el) => !deletedStats.has(el.timestamp)),
          chest: CollectionUtils.concatBy(
            oldStorage.stats.length.chest || [],
            newStorage.stats.length.chest || [],
            (el) => `${el.timestamp}`
          ).filter((el) => !deletedStats.has(el.timestamp)),
          waist: CollectionUtils.concatBy(
            oldStorage.stats.length.waist || [],
            newStorage.stats.length.waist || [],
            (el) => `${el.timestamp}`
          ).filter((el) => !deletedStats.has(el.timestamp)),
          hips: CollectionUtils.concatBy(
            oldStorage.stats.length.hips || [],
            newStorage.stats.length.hips || [],
            (el) => `${el.timestamp}`
          ).filter((el) => !deletedStats.has(el.timestamp)),
          thighLeft: CollectionUtils.concatBy(
            oldStorage.stats.length.thighLeft || [],
            newStorage.stats.length.thighLeft || [],
            (el) => `${el.timestamp}`
          ).filter((el) => !deletedStats.has(el.timestamp)),
          thighRight: CollectionUtils.concatBy(
            oldStorage.stats.length.thighRight || [],
            newStorage.stats.length.thighRight || [],
            (el) => `${el.timestamp}`
          ).filter((el) => !deletedStats.has(el.timestamp)),
          calfLeft: CollectionUtils.concatBy(
            oldStorage.stats.length.calfLeft || [],
            newStorage.stats.length.calfLeft || [],
            (el) => `${el.timestamp}`
          ).filter((el) => !deletedStats.has(el.timestamp)),
          calfRight: CollectionUtils.concatBy(
            oldStorage.stats.length.calfRight || [],
            newStorage.stats.length.calfRight || [],
            (el) => `${el.timestamp}`
          ).filter((el) => !deletedStats.has(el.timestamp)),
        },
        percentage: {
          bodyfat: CollectionUtils.concatBy(
            oldStorage.stats.percentage.bodyfat || [],
            newStorage.stats.percentage.bodyfat || [],
            (el) => `${el.timestamp}`
          ).filter((el) => !deletedStats.has(el.timestamp)),
        },
      },
      settings: {
        equipment: mergeAs2("settings", "equipment", (a, b) => Equipment.mergeEquipment(a, b)),
        graphsSettings: merge2("settings", "graphsSettings"),
        graphOptions: merge2("settings", "graphOptions"),
        exerciseStatsSettings: merge2("settings", "exerciseStatsSettings"),
        lengthUnits: merge2("settings", "lengthUnits"),
        statsEnabled: merge2("settings", "statsEnabled"),
        exercises: deepmerge(oldStorage.settings.exercises, newStorage.settings.exercises),
        graphs: mergeAs2("settings", "graphs", (_, b) => b || []),
        timers: deepmerge(oldStorage.settings.timers, newStorage.settings.timers),
        units: merge2("settings", "units"),
        isPublicProfile: merge2("settings", "isPublicProfile"),
        shouldShowFriendsHistory: merge2("settings", "shouldShowFriendsHistory"),
        nickname: merge2("settings", "nickname"),
        vibration: merge2("settings", "vibration"),
        volume: merge2("settings", "volume"),
        alwaysOnDisplay: merge2("settings", "alwaysOnDisplay"),
      },
      subscription: mergeAs("subscription", (a, b) => ({
        apple: { ...a.apple, ...b.apple },
        google: { ...a.google, ...b.google },
      })),
      tempUserId: mergeAs("tempUserId", (a, b) => b || a || UidFactory.generateUid(10)),
      currentProgramId: merge("currentProgramId"),
      history: CollectionUtils.concatBy(oldStorage.history, newStorage.history, (el) => el.date).filter(
        (el) => !deletedHistory.has(el.startTime)
      ),
      version: merge("version"),
      programs: mergeAs("programs", (a, b) =>
        CollectionUtils.concatBy(
          a,
          b.map((p) => {
            const oldProgram = a.find((op) => op.id === p.id);
            if (oldProgram) {
              const mergedProgram = Program.mergePrograms(oldProgram, p, enforceNew);
              return mergedProgram;
            } else {
              return p;
            }
          }),
          (e) => e.id
        ).filter((p) => !p.clonedAt || !deletedPrograms.has(p.clonedAt))
      ),
      helps: Array.from(new Set([...newStorage.helps, ...oldStorage.helps])),
      whatsNew: merge("whatsNew"),
    };
    return storage;
  }
}
