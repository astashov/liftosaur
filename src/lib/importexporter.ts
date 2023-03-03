import { IStorage } from "../types";
import { DateUtils } from "../utils/date";
import { Exporter } from "../utils/exporter";
import { IExportedProgram } from "../models/program";
import { Storage } from "../models/storage";
import { IEither } from "../utils/types";
import { getLatestMigrationVersion } from "../migrations/migrations";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import { ObjectUtils } from "../utils/object";
import { ImportFromLink } from "../utils/importFromLink";

export namespace ImportExporter {
  export function exportStorage(storage: IStorage): void {
    Exporter.toFile(`liftosaur-${DateUtils.formatYYYYMMDD(Date.now())}.json`, JSON.stringify(storage, null, 2));
  }

  export async function getExportedProgram(
    client: Window["fetch"],
    maybeProgram: string
  ): Promise<IEither<IExportedProgram, string[]>> {
    let parsedMaybeProgram: IExportedProgram;
    try {
      parsedMaybeProgram = JSON.parse(maybeProgram);
    } catch (e) {
      return { success: false, error: ["Couldn't parse the provided file"] };
    }
    const payload = Storage.getDefault();
    payload.settings = { ...payload.settings, ...parsedMaybeProgram.settings };
    payload.settings.exercises = { ...payload.settings.exercises, ...parsedMaybeProgram.customExercises };
    payload.programs.push(parsedMaybeProgram.program);
    payload.version = parsedMaybeProgram.version;
    const result = await Storage.get(client, payload, false);
    if (result.success) {
      const storage = result.data;
      const customExercises = storage.settings.exercises;
      const program = storage.programs.filter((p) => p.id === parsedMaybeProgram.program.id)[0];
      return {
        success: true,
        data: {
          customExercises,
          program,
          version: getLatestMigrationVersion(),
          settings: ObjectUtils.pick(payload.settings, ["timers", "units"]),
        },
      };
    } else {
      return result;
    }
  }

  export async function handleUniversalLink(dispatch: IDispatch, link: string, client: Window["fetch"]): Promise<void> {
    const url = new URL(link);
    if (url.pathname === "/program" && url.searchParams.has("data")) {
      const data = await ImportFromLink.importFromLink(link, client);
      if (data.success) {
        dispatch(Thunk.importProgram(data.data));
      } else {
        alert(data.error.join("\n"));
      }
    }
  }
}
