import { runMigrations } from "../migrations/runner";
import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";
import { getLatestMigrationVersion } from "../migrations/migrations";
import { UidFactory } from "../utils/generator";
import { TStorage, IStorage } from "../types";
import { Settings } from "../models/settings";
import { IEither } from "../utils/types";
import RB from "rollbar";
import { IState, updateState } from "./state";
import { lb } from "lens-shmens";
import { IDispatch } from "../ducks/types";

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
    return {
      id: 0,
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
      settings: Settings.build(),
      history: [],
      version: getLatestMigrationVersion(),
      subscription: { apple: {}, google: {} },
      programs: [],
      helps: [],
      email: undefined,
      whatsNew: undefined,
    };
  }

  export async function getWithDefault(
    client: Window["fetch"],
    maybeStorage?: Record<string, unknown>,
    shouldReportError?: boolean
  ): Promise<IStorage> {
    const storage = await get(client, maybeStorage, shouldReportError);
    if (storage.success) {
      return storage.data;
    } else {
      return getDefault();
    }
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
}
