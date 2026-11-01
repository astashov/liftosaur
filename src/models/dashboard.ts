import {
  LiftographGraphs_exerciseDocument,
  LiftographGraphs_exerciseSource,
  LiftographGraphs_muscleGroupDocument,
  LiftographGraphs_statsDocument,
} from "../liftograph/liftographGraphs";
import { LiftographScriptFns_muscleGroupKeys } from "../liftograph/liftographScriptFns";
import { IDashboard, IGraph, ISettings, IStorage } from "../types";
import { IEither } from "../utils/types";
import { Exercise_find, Exercise_fromKey, Exercise_nameWithEquipment } from "./exercise";
import { Muscle_getMuscleGroupName } from "./muscle";
import { Stats_name } from "./stats";

export const Dashboard_seedId = "graphs";
export const Dashboard_maxCount = 20;
export const Dashboard_maxTextBytes = 64 * 1024;

function utf8Length(text: string): number {
  let length = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    length += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return length;
}

function legacyGraphBlock(graph: IGraph, settings: ISettings): string | undefined {
  if (graph.type === "exercise") {
    const exerciseType = Exercise_fromKey(graph.id);
    const exercise = Exercise_find(exerciseType, settings.exercises);
    if (exercise == null) {
      return undefined;
    }
    const isWithBodyweight =
      !!settings.graphsSettings.isWithBodyweight && settings.graphs.graphs.some((g) => g.id === "weight");
    const document = LiftographGraphs_exerciseDocument(
      LiftographGraphs_exerciseSource(exerciseType, settings),
      settings.graphsSettings.defaultType ?? "weight",
      !!settings.graphsSettings.isWithOneRm,
      isWithBodyweight
    );
    return `// **${Exercise_nameWithEquipment(exercise, settings)}**\n${document}`;
  } else if (graph.type === "muscleGroup") {
    if (graph.id !== "total" && !LiftographScriptFns_muscleGroupKeys(settings).has(graph.id)) {
      return undefined;
    }
    const name = graph.id === "total" ? "Total" : Muscle_getMuscleGroupName(graph.id, settings);
    const metric = settings.graphsSettings.defaultMuscleGroupType ?? "volume";
    return `// **${name}**\n${LiftographGraphs_muscleGroupDocument(graph.id, metric)}`;
  }
  const window = settings.graphOptions[graph.id]?.movingAverageWindowSize;
  return `// **${Stats_name(graph.id)}**\n${LiftographGraphs_statsDocument(graph.id, window)}`;
}

export function Dashboard_fromLegacyGraphs(settings: ISettings): IDashboard {
  const blocks: string[] = [];
  for (const graph of settings.graphs.graphs) {
    const block = legacyGraphBlock(graph, settings);
    if (block != null) {
      blocks.push(block);
    }
  }
  return { vtype: "dashboard", id: Dashboard_seedId, name: "Graphs", text: blocks.join("\n\n") };
}

export function Dashboard_current(
  storage: Pick<IStorage, "dashboards" | "currentDashboardId">
): IDashboard | undefined {
  const dashboards = storage.dashboards ?? [];
  return dashboards.find((d) => d.id === storage.currentDashboardId) ?? dashboards[0];
}

export function Dashboard_validate(dashboards: IDashboard[]): IEither<undefined, string> {
  if (dashboards.length > Dashboard_maxCount) {
    return { success: false, error: `You can have at most ${Dashboard_maxCount} dashboards` };
  }
  const tooLarge = dashboards.find((d) => utf8Length(d.text) > Dashboard_maxTextBytes);
  if (tooLarge != null) {
    return { success: false, error: `Dashboard '${tooLarge.name}' is larger than 64 KB` };
  }
  return { success: true, data: undefined };
}
