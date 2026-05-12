import { IStorage } from "../types";

export function WatchStorageFilter_filter(storage: IStorage): unknown {
  const clone = JSON.parse(JSON.stringify(storage)) as Record<string, unknown>;

  const currentProgramId = clone.currentProgramId as string | undefined;
  const programs = (clone.programs as Array<Record<string, unknown>> | undefined) ?? [];

  if (currentProgramId) {
    clone.programs = programs.filter((p) => p.id === currentProgramId);
  }

  clone.history = [];
  clone.stats = { weight: {}, length: {}, percentage: {} };

  const progressArray = clone.progress as Array<Record<string, unknown>> | undefined;
  if (progressArray) {
    clone.progress = progressArray.map(({ ui: _ui, ...rest }) => rest);
  }

  const versions = clone._versions as Record<string, unknown> | undefined;
  if (versions) {
    versions.history = { items: {} };
    versions.stats = { weight: {}, length: {}, percentage: {} };

    const programVersions = versions.programs as Record<string, unknown> | undefined;
    const items = programVersions?.items as Record<string, unknown> | undefined;
    const filteredPrograms = clone.programs as Array<Record<string, unknown>>;
    const currentProgram = filteredPrograms[0];
    const clonedAt = currentProgram?.clonedAt;
    if (programVersions && items && clonedAt != null) {
      const clonedAtKey = `${clonedAt}`;
      const filteredItems: Record<string, unknown> = {};
      if (items[clonedAtKey] != null) {
        filteredItems[clonedAtKey] = items[clonedAtKey];
      }
      programVersions.items = filteredItems;
    }
  }

  return clone;
}

export function WatchStorageFilter_filterJson(storage: IStorage): string {
  return JSON.stringify(WatchStorageFilter_filter(storage));
}
