import * as fs from "fs";
import { parser as plannerExerciseParser } from "../../src/pages/planner/plannerExerciseParser";
import { IRenderRecording } from "../harness/renderApp";

const HOST_OR_LIBRARY =
  /^(|View|Text|TextInput|TextInputInner|Pressable|PressabilityDebugView|Path|G|Svg|Rect|Circle|Line|Defs|ClipPath|RNSVG\w*|ScrollView|RCTScrollView|ScrollViewContext\w*|Image|FastText|Animated\w*|SceneView|NavigationProvider|NavigationContent|EnsureSingleNavigator|Provider|ContextProvider|StaticContainer|Screen|ScreenContainer|ScreenStack\w*|Freeze|Suspense\w*|DelayedFreeze|GestureDetector\w*|Wrap|PerfProfiler|Profiler|IconSvg|passthrough|PreventRemoveProvider|InnerScreen|Suspender|NavigationStateListenerProvider|SafeAreaProviderCompat|FrameSizeProvider|DebugContainer|ScreenContentWrapper|NativeStackNavigator|NativeStackView|ScreenErrorBoundary|NavigationContainerInner|BaseNavigationContainer|ThemeProvider|ModalStateProvider|ActiveSheetHeightProvider|SheetBackdropProvider|CustomKeyboardProvider|SystemBars|AppRoot|AppNavigator|SheetBackdropLift|ActionSheetHost|BottomTabView|BottomTabNavigator|MaybeScreen\w*|TabBar\w*|SceneContent|Background|HeaderShownContext|NavigationRouteContext\w*|ScreenFooter|ScreenStackItem|FooterComponent|MaybeNestedStack|HeaderConfig|KeyboardProvider|BottomSheet\w*)$/;

interface IComponentRow {
  renders: number;
  instances: number;
  maxPerInstance: number;
  mounted: number;
  unmounted: number;
  changedProps: Set<string>;
  unexplained: number;
}

export interface IParseCount {
  calls: number;
  ms: number;
}

export interface IReportOpts {
  limit?: number;
  sortBy?: "renders" | "mounted" | "unmounted";
  parses?: IParseCount;
}

export function ReportFormat_recording(name: string, recording: IRenderRecording, opts: IReportOpts = {}): string {
  const rows: Record<string, IComponentRow> = {};
  for (const r of recording.trace.records) {
    const row = rows[r.component] ?? {
      renders: 0,
      instances: 0,
      maxPerInstance: 0,
      mounted: 0,
      unmounted: 0,
      changedProps: new Set<string>(),
      unexplained: 0,
    };
    row.renders += r.commits;
    row.instances += r.commits > 0 ? 1 : 0;
    row.maxPerInstance = Math.max(row.maxPerInstance, r.commits);
    row.mounted += r.didMount ? 1 : 0;
    row.unmounted += r.didUnmount ? 1 : 0;
    r.changedProps.forEach((p) => row.changedProps.add(p));
    row.unexplained += r.commits > 0 && !r.didMount && r.changedProps.length === 0 ? 1 : 0;
    rows[r.component] = row;
  }
  const sortBy = opts.sortBy ?? "renders";
  const all = Object.entries(rows);
  const app = all.filter(([c]) => !HOST_OR_LIBRARY.test(c)).sort((a, b) => b[1][sortBy] - a[1][sortBy]);
  const sum = (entries: [string, IComponentRow][], key: "renders" | "mounted" | "unmounted"): number =>
    entries.reduce((s, [, v]) => s + v[key], 0);
  const parses = opts.parses != null ? `; ${opts.parses.calls} day parses, ${opts.parses.ms.toFixed(0)}ms parsing` : "";
  const lines = [
    `## ${name}`,
    `action: ${recording.actionMs.toFixed(0)}ms, ${recording.actionCommits} commits; ` +
      `total ${recording.commits} commits, settled after ${recording.windows} window(s)${parses}`,
    `all components: ${sum(all, "renders")} renders, ${sum(all, "mounted")} mounted, ${sum(all, "unmounted")} unmounted`,
    `app components: ${sum(app, "renders")} renders, ${sum(app, "mounted")} mounted, ${sum(app, "unmounted")} unmounted`,
    "component: renders / instances / max per instance / mounted / unmounted / no prop change — changed props",
    ...app
      .filter(([, v]) => v.renders > 0 || v.unmounted > 0)
      .slice(0, opts.limit ?? 60)
      .map(
        ([c, v]) =>
          `  ${c}: ${v.renders} / ${v.instances} / ${v.maxPerInstance} / ${v.mounted} / ${v.unmounted} / ${v.unexplained}` +
          (v.changedProps.size > 0 ? ` — ${Array.from(v.changedProps).slice(0, 8).join(", ")}` : "")
      ),
    "",
  ];
  return lines.join("\n");
}

export async function ReportFormat_countParses<T>(fn: () => Promise<T>): Promise<{ result: T; parses: IParseCount }> {
  const original = plannerExerciseParser.parse.bind(plannerExerciseParser);
  const parses: IParseCount = { calls: 0, ms: 0 };
  const spy = jest.spyOn(plannerExerciseParser, "parse").mockImplementation((...args) => {
    const startedAt = performance.now();
    try {
      return original(...args);
    } finally {
      parses.calls += 1;
      parses.ms += performance.now() - startedAt;
    }
  });
  try {
    return { result: await fn(), parses };
  } finally {
    spy.mockRestore();
  }
}

export const ReportFormat_out = process.env.RENDER_REPORT_OUT;

export const ReportFormat_describe = ReportFormat_out != null ? describe : describe.skip;

export function ReportFormat_emit(text: string): void {
  if (ReportFormat_out != null) {
    fs.appendFileSync(ReportFormat_out, text + "\n");
  }
}
