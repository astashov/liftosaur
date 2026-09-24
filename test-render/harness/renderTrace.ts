export interface IRenderTarget {
  entry?: string;
  set?: string;
  mode?: string;
  name?: string;
}

export interface IRenderSelector {
  component?: string;
  entry?: string;
  set?: string;
  mode?: string;
  name?: string;
}

export type IRenderObservation =
  | {
      kind: "render";
      mountId: number;
      component: string;
      target: IRenderTarget;
      changedProps: readonly string[];
      didMount: boolean;
    }
  | { kind: "unmount"; mountId: number; component: string; target: IRenderTarget };

export interface IRenderRecord {
  component: string;
  target: IRenderTarget;
  mountId: number;
  commits: number;
  changedProps: readonly string[];
  didMount: boolean;
  didUnmount: boolean;
}

export interface IRenderTrace {
  records: readonly IRenderRecord[];
}

type IProps = Record<string, unknown>;

function field(props: IProps, key: string): string | undefined {
  const value = props[key];
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return undefined;
}

function nestedId(props: IProps, key: string): string | undefined {
  const value = props[key];
  if (value != null && typeof value === "object") {
    const id = (value as IProps).id;
    if (typeof id === "string" || typeof id === "number") {
      return String(id);
    }
  }
  return undefined;
}

export function RenderTrace_target(props: IProps): IRenderTarget {
  const target: IRenderTarget = {};
  const entry = nestedId(props, "entry") ?? field(props, "entryIndex");
  const set = nestedId(props, "set") ?? field(props, "setIndex");
  const mode = field(props, "type") ?? field(props, "mode");
  const name = field(props, "name");
  if (entry != null) {
    target.entry = entry;
  }
  if (set != null) {
    target.set = set;
  }
  if (mode != null) {
    target.mode = mode;
  }
  if (name != null) {
    target.name = name;
  }
  return target;
}

export function RenderTrace_label(component: string, target: IRenderTarget): string {
  const parts: string[] = [];
  if (target.entry != null) {
    parts.push(`entry=${target.entry}`);
  }
  if (target.mode != null) {
    parts.push(`mode=${target.mode}`);
  }
  if (target.set != null) {
    parts.push(`set=${target.set}`);
  }
  if (parts.length === 0 && target.name != null) {
    parts.push(`name=${target.name}`);
  }
  return parts.length > 0 ? `${component}[${parts.join(", ")}]` : component;
}

export function RenderTrace_matches(component: string, target: IRenderTarget, selector: IRenderSelector): boolean {
  if (selector.component != null && selector.component !== component) {
    return false;
  }
  for (const key of ["entry", "set", "mode", "name"] as const) {
    const wanted = selector[key];
    if (wanted != null && wanted !== target[key]) {
      return false;
    }
  }
  return true;
}

export function RenderTrace_changedKeys(prev: IProps, next: IProps): string[] {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const changed: string[] = [];
  for (const key of keys) {
    if (!Object.is(prev[key], next[key])) {
      changed.push(key);
    }
  }
  return changed.sort();
}

export function RenderTrace_build(observations: readonly IRenderObservation[]): IRenderTrace {
  const records = new Map<number, IRenderRecord>();
  for (const observation of observations) {
    const existing = records.get(observation.mountId);
    const base: IRenderRecord = existing ?? {
      component: observation.component,
      target: observation.target,
      mountId: observation.mountId,
      commits: 0,
      changedProps: [],
      didMount: false,
      didUnmount: false,
    };
    if (observation.kind === "render") {
      records.set(observation.mountId, {
        ...base,
        target: observation.target,
        commits: base.commits + 1,
        changedProps: Array.from(new Set([...base.changedProps, ...observation.changedProps])).sort(),
        didMount: base.didMount || observation.didMount,
      });
    } else {
      records.set(observation.mountId, { ...base, didUnmount: true });
    }
  }
  return { records: Array.from(records.values()) };
}

export function RenderTrace_select(trace: IRenderTrace, selector: IRenderSelector): IRenderRecord[] {
  return trace.records.filter((r) => r.commits > 0 && RenderTrace_matches(r.component, r.target, selector));
}

export function RenderTrace_remounts(trace: IRenderTrace): IRenderRecord[] {
  return trace.records.filter((r) => r.didUnmount || (r.didMount && r.commits > 0));
}

export function RenderTrace_totalCommits(records: readonly IRenderRecord[]): number {
  return records.reduce((sum, r) => sum + r.commits, 0);
}

export function RenderTrace_byComponent(records: readonly IRenderRecord[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const record of records) {
    totals[record.component] = (totals[record.component] ?? 0) + record.commits;
  }
  return totals;
}

export function RenderTrace_byInstance(records: readonly IRenderRecord[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const record of records) {
    const label = RenderTrace_label(record.component, record.target);
    totals[label] = (totals[label] ?? 0) + record.commits;
  }
  return totals;
}

export function RenderTrace_format(records: readonly IRenderRecord[]): string {
  if (records.length === 0) {
    return "(nothing)";
  }
  return records
    .map((r) => {
      const lines = [RenderTrace_label(r.component, r.target), `  commits: ${r.commits}`];
      if (r.changedProps.length > 0) {
        lines.push(`  changed props: ${r.changedProps.join(", ")}`);
      } else if (r.commits > 0 && !r.didMount) {
        lines.push(`  props unchanged; cause not identified by the prop diff`);
      }
      if (r.didMount) {
        lines.push(`  mounted in this window`);
      }
      if (r.didUnmount) {
        lines.push(`  unmounted in this window`);
      }
      return lines.join("\n");
    })
    .join("\n");
}
