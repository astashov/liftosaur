import { ISettings, IStorage } from "../types";
import { DateUtils_formatYYYYMMDD } from "../utils/date";
import { Exporter_toFile } from "../utils/exporter";
import { IExportedProgram } from "../models/program";
import { Storage_getDefault, Storage_get, Storage_setAffiliate } from "../models/storage";
import { IEither } from "../utils/types";
import { getLatestMigrationVersion } from "../migrations/migrations";
import { IDispatch } from "../ducks/types";
import { Thunk_importProgram } from "../ducks/thunks";
import { ObjectUtils_clone, ObjectUtils_pick } from "../utils/object";
import { ImportFromLink_importFromLink } from "../utils/importFromLink";
import { UrlUtils } from "../utils/url";
import { IExportedPlannerProgram } from "../pages/planner/models/types";
import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import { Settings_build } from "../models/settings";

export function ImportExporter_exportStorage(storage: IStorage): void {
  Exporter_toFile(`liftosaur-${DateUtils_formatYYYYMMDD(Date.now())}.json`, JSON.stringify(storage, null, 2));
}

function isPlanProgram(program: IExportedProgram | IExportedPlannerProgram): program is IExportedPlannerProgram {
  return "type" in program && program.type === "v2";
}

export async function ImportExporter_getExportedProgram(
  client: Window["fetch"],
  maybeProgram: string,
  settings?: ISettings
): Promise<IEither<IExportedProgram, string[]>> {
  let parsedMaybeProgram: IExportedProgram | IExportedPlannerProgram;
  try {
    parsedMaybeProgram = JSON.parse(maybeProgram);
  } catch (e) {
    return { success: false, error: ["Couldn't parse the provided file"] };
  }
  let exportedProgram: IExportedProgram;
  if (isPlanProgram(parsedMaybeProgram)) {
    exportedProgram = PlannerProgram.convertExportedPlannerToProgram(parsedMaybeProgram, settings || Settings_build());
  } else {
    exportedProgram = parsedMaybeProgram;
  }
  const payload = Storage_getDefault();
  payload.settings = ObjectUtils_clone(settings || payload.settings);
  payload.settings.timers.workout = exportedProgram.settings?.timers?.workout || payload.settings.timers.workout;
  payload.settings.units = exportedProgram.settings?.units || payload.settings.units;
  payload.settings.exercises = exportedProgram.customExercises;
  payload.programs.push(exportedProgram.program);
  payload.version = exportedProgram.version;
  const result = Storage_get(payload, false);
  if (result.success) {
    const storage = result.data;
    const customExercises = storage.settings.exercises;
    const program = storage.programs.filter((p) => p.id === exportedProgram.program.id)[0];
    return {
      success: true,
      data: {
        customExercises,
        program,
        version: getLatestMigrationVersion(),
        settings: ObjectUtils_pick(payload.settings, ["timers", "units"]),
      },
    };
  } else {
    return result;
  }
}

export async function ImportExporter_handleUniversalLink(
  dispatch: IDispatch,
  link: string,
  client: Window["fetch"]
): Promise<void> {
  const url = UrlUtils.build(link);
  if ((url.pathname === "/program" && url.searchParams.has("data")) || url.pathname.startsWith("/p/")) {
    const data = await ImportFromLink_importFromLink(link, client);
    if (data.success) {
      const source = data.data.source;
      if (source) {
        Storage_setAffiliate(dispatch, source, "program");
      }
      dispatch(Thunk_importProgram(data.data));
    } else {
      alert(data.error.join("\n"));
    }
  }
}
