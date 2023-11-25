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
      tempUserId: UidFactory.generateUid(10),
      affiliates: {},
      stats: {
        weight: {},
        length: {},
        percentage: {},
      },
      deletedStats: [],
      settings: Settings.build(),
      history: [],
      deletedHistory: [],
      version: getLatestMigrationVersion(),
      subscription: { apple: {}, google: {} },
      programs: [],
      deletedPrograms: [],
      helps: [],
      email: undefined,
      whatsNew: undefined,
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
    const changed = !ObjectUtils.isEqual(cleanedAStorage, cleanedBStorage);
    if (changed) {
      console.log(cleanedAStorage, cleanedBStorage);
      console.log("Storage changed", ObjectUtils.diffPaths(cleanedAStorage, cleanedBStorage));
    }
    return changed;
  }

  export function isFullStorage(storage: IStorage | IPartialStorage): storage is IStorage {
    return storage.programs != null && storage.history != null && storage.stats != null;
  }

  export function updateIds(storage: IStorage | IPartialStorage): void {
    storage.originalId = storage.id;
    for (const program of storage.programs || []) {
      if (program.version != null) {
        program.originalVersion = program.version;
      }
    }
  }

  export function mergeStorage(aStorage: IStorage, bStorage: IStorage): IStorage {
    const oldStorage = aStorage.id < bStorage.id ? aStorage : bStorage;
    const newStorage = aStorage.id < bStorage.id ? bStorage : aStorage;
    const storage: IStorage = {
      id: newStorage.id,
      originalId: newStorage.originalId,
      email: newStorage.email,
      reviewRequests: newStorage.reviewRequests,
      signupRequests: newStorage.signupRequests,
      affiliates: newStorage.affiliates,
      stats: {
        weight: {
          weight: CollectionUtils.concatBy(
            oldStorage.stats.weight.weight || [],
            newStorage.stats.weight.weight || [],
            (el) => `${el.timestamp}`
          ),
        },
        length: {
          neck: CollectionUtils.concatBy(
            oldStorage.stats.length.neck || [],
            newStorage.stats.length.neck || [],
            (el) => `${el.timestamp}`
          ),
          shoulders: CollectionUtils.concatBy(
            oldStorage.stats.length.shoulders || [],
            newStorage.stats.length.shoulders || [],
            (el) => `${el.timestamp}`
          ),
          bicepLeft: CollectionUtils.concatBy(
            oldStorage.stats.length.bicepLeft || [],
            newStorage.stats.length.bicepLeft || [],
            (el) => `${el.timestamp}`
          ),
          bicepRight: CollectionUtils.concatBy(
            oldStorage.stats.length.bicepRight || [],
            newStorage.stats.length.bicepRight || [],
            (el) => `${el.timestamp}`
          ),
          forearmLeft: CollectionUtils.concatBy(
            oldStorage.stats.length.forearmLeft || [],
            newStorage.stats.length.forearmLeft || [],
            (el) => `${el.timestamp}`
          ),
          forearmRight: CollectionUtils.concatBy(
            oldStorage.stats.length.forearmRight || [],
            newStorage.stats.length.forearmRight || [],
            (el) => `${el.timestamp}`
          ),
          chest: CollectionUtils.concatBy(
            oldStorage.stats.length.chest || [],
            newStorage.stats.length.chest || [],
            (el) => `${el.timestamp}`
          ),
          waist: CollectionUtils.concatBy(
            oldStorage.stats.length.waist || [],
            newStorage.stats.length.waist || [],
            (el) => `${el.timestamp}`
          ),
          hips: CollectionUtils.concatBy(
            oldStorage.stats.length.hips || [],
            newStorage.stats.length.hips || [],
            (el) => `${el.timestamp}`
          ),
          thighLeft: CollectionUtils.concatBy(
            oldStorage.stats.length.thighLeft || [],
            newStorage.stats.length.thighLeft || [],
            (el) => `${el.timestamp}`
          ),
          thighRight: CollectionUtils.concatBy(
            oldStorage.stats.length.thighRight || [],
            newStorage.stats.length.thighRight || [],
            (el) => `${el.timestamp}`
          ),
          calfLeft: CollectionUtils.concatBy(
            oldStorage.stats.length.calfLeft || [],
            newStorage.stats.length.calfLeft || [],
            (el) => `${el.timestamp}`
          ),
          calfRight: CollectionUtils.concatBy(
            oldStorage.stats.length.calfRight || [],
            newStorage.stats.length.calfRight || [],
            (el) => `${el.timestamp}`
          ),
        },
        percentage: {
          bodyfat: CollectionUtils.concatBy(
            oldStorage.stats.percentage.bodyfat || [],
            newStorage.stats.percentage.bodyfat || [],
            (el) => `${el.timestamp}`
          ),
        },
      },
      settings: {
        equipment: Equipment.mergeEquipment(oldStorage.settings.equipment, newStorage.settings.equipment),
        graphsSettings: newStorage.settings.graphsSettings,
        graphOptions: newStorage.settings.graphOptions,
        exerciseStatsSettings: newStorage.settings.exerciseStatsSettings,
        lengthUnits: newStorage.settings.lengthUnits,
        statsEnabled: newStorage.settings.statsEnabled,
        exercises: newStorage.settings.exercises,
        graphs: newStorage.settings.graphs || [],
        timers: deepmerge(oldStorage.settings.timers, newStorage.settings.timers),
        units: newStorage.settings.units,
        isPublicProfile: newStorage.settings.isPublicProfile,
        shouldShowFriendsHistory: newStorage.settings.shouldShowFriendsHistory,
        nickname: newStorage.settings.nickname,
        volume: newStorage.settings.volume,
      },
      subscription: {
        apple: { ...oldStorage.subscription.apple, ...newStorage.subscription.apple },
        google: { ...oldStorage.subscription.google, ...newStorage.subscription.google },
      },
      tempUserId: newStorage.tempUserId || oldStorage.tempUserId || UidFactory.generateUid(10),
      currentProgramId: newStorage.currentProgramId,
      history: CollectionUtils.concatBy(oldStorage.history, newStorage.history, (el) => el.date),
      version: newStorage.version,
      programs: newStorage.programs.map((p) => {
        const oldProgram = oldStorage.programs.find((op) => op.id === p.id);
        if (oldProgram) {
          return Program.mergePrograms(oldProgram, p);
        } else {
          return p;
        }
      }),
      helps: Array.from(new Set([...newStorage.helps, ...oldStorage.helps])),
      whatsNew: newStorage.whatsNew,
    };
    return storage;
  }
}
