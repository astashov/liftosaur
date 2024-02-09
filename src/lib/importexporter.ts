import { ISettings, IStorage } from "../types";
import { DateUtils } from "../utils/date";
import { Exporter } from "../utils/exporter";
import { IExportedProgram, Program } from "../models/program";
import { Storage } from "../models/storage";
import { IEither } from "../utils/types";
import { getLatestMigrationVersion } from "../migrations/migrations";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import { ObjectUtils } from "../utils/object";
import { ImportFromLink } from "../utils/importFromLink";
import { IBuilderProgram } from "../pages/builder/models/types";
import { UrlUtils } from "../utils/url";

export namespace ImportExporter {
  export function exportStorage(storage: IStorage): void {
    Exporter.toFile(`liftosaur-${DateUtils.formatYYYYMMDD(Date.now())}.json`, JSON.stringify(storage, null, 2));
  }

  function isPlanProgram(program: IExportedProgram | IBuilderProgram): program is IBuilderProgram {
    return "weeks" in program;
  }

  export async function getExportedProgram(
    client: Window["fetch"],
    maybeProgram: string,
    settings?: ISettings
  ): Promise<IEither<IExportedProgram, string[]>> {
    let parsedMaybeProgram: IExportedProgram | IBuilderProgram;
    try {
      parsedMaybeProgram = JSON.parse(maybeProgram);
    } catch (e) {
      return { success: false, error: ["Couldn't parse the provided file"] };
    }
    let exportedProgram: IExportedProgram;
    if (isPlanProgram(parsedMaybeProgram)) {
      const program = Program.planToProgram(parsedMaybeProgram);
      const units = parsedMaybeProgram.weeks[0]?.days[0]?.exercises[0]?.onerm.unit;
      exportedProgram = {
        program,
        version: getLatestMigrationVersion(),
        settings: {
          timers: { workout: 180, warmup: 90 },
          units,
        },
        customExercises: {},
        customEquipment: {},
      };
    } else {
      exportedProgram = parsedMaybeProgram;
    }
    const payload = Storage.getDefault();
    payload.settings = ObjectUtils.clone(settings || payload.settings);
    payload.settings.timers.workout = exportedProgram.settings.timers.workout || payload.settings.timers.workout;
    payload.settings.units = exportedProgram.settings.units || payload.settings.units;
    payload.settings.exercises = exportedProgram.customExercises;
    payload.settings.equipment = exportedProgram.customEquipment || {};
    payload.programs.push(exportedProgram.program);
    payload.version = exportedProgram.version;
    const result = await Storage.get(client, payload, false);
    if (result.success) {
      const storage = result.data;
      const customExercises = storage.settings.exercises;
      const customEquipment = storage.settings.equipment;
      const program = storage.programs.filter((p) => p.id === exportedProgram.program.id)[0];
      return {
        success: true,
        data: {
          customExercises,
          customEquipment,
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
    const url = UrlUtils.build(link);
    if ((url.pathname === "/program" && url.searchParams.has("data")) || url.pathname.startsWith("/p/")) {
      const data = await ImportFromLink.importFromLink(link, client);
      if (data.success) {
        Storage.setAffiliate(dispatch, data.data.source);
        dispatch(Thunk.importProgram(data.data.decoded));
      } else {
        alert(data.error.join("\n"));
      }
    }
  }
}
