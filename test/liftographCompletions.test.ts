import "mocha";
import { expect } from "chai";
import { LiftographEditorAnalysis } from "../src/liftograph/liftographEditorAnalysis";
import {
  ILiftographCompletion,
  ILiftographCompletionHost,
  LiftographCompletions_apply,
  LiftographCompletions_editTyped,
  LiftographCompletions_tap,
} from "../src/liftograph/liftographCompletions";
import { EditorState } from "@codemirror/state";
import { LiftographDocument_parse } from "../src/liftograph/liftographDocument";
import { LiftographLanguage_support, LiftographLanguage_tree } from "../src/liftograph/liftographLanguage";
import { fxSettings } from "./liftographFixtures";

const settings = fxSettings();

function at(
  marked: string,
  host: ILiftographCompletionHost = "popup",
  explicit: boolean = true
): ILiftographCompletion | undefined {
  const pos = marked.indexOf("|");
  const text = marked.replace("|", "");
  return new LiftographEditorAnalysis(settings).completions(text, pos, host, explicit);
}

function labels(marked: string, host: ILiftographCompletionHost = "popup"): string[] {
  return at(marked, host)?.options.map((o) => o.label) ?? [];
}

function applied(marked: string, label: string, host: ILiftographCompletionHost = "popup"): string {
  const pos = marked.indexOf("|");
  const text = marked.replace("|", "");
  const completion = new LiftographEditorAnalysis(settings).completions(text, pos, host, true);
  const option = completion?.options.find((o) => o.label === label);
  const edit = option != null ? LiftographCompletions_apply(completion, option) : undefined;
  if (edit == null) {
    throw new Error(`no '${label}' at the caret`);
  }
  const result = text.slice(0, edit.from) + edit.insert + text.slice(edit.to);
  return result.slice(0, edit.caret) + "|" + result.slice(edit.caret);
}

describe("LiftographCompletions", () => {
  it("offers widget templates at a line start, and drops row inside a row", () => {
    expect(labels("|")).to.deep.equal(["graph", "value", "//", "row"]);
    expect(labels("row {\n  |\n}")).to.deep.equal(["graph", "value", "//"]);
    expect(applied("gr|", "graph")).to.equal("graph {\n  name: | / source: exercise() / y: e1rm\n}");
    expect(applied("row {\n  |\n}", "graph")).to.equal(
      "row {\n  graph {\n    name: | / source: exercise() / y: e1rm\n  }\n}"
    );
  });

  it("offers the keys a line still accepts, counting the whole line but not the key being typed", () => {
    expect(labels("graph {\n  name: A / |\n}")).to.deep.equal([
      "source",
      "y",
      "group",
      "smooth",
      "mark",
      "axis",
      "color",
    ]);
    expect(labels("graph {\n  name: A / sou| / y: e1rm\n}")).to.deep.equal([
      "source",
      "group",
      "smooth",
      "mark",
      "axis",
      "color",
    ]);
    expect(labels("graph / |{\n}")).to.deep.equal(["range"]);
    expect(labels("value / source: workout / |")).to.include.members(["compare", "trend"]);
    expect(applied("graph {\n  name: A / so|\n}", "source")).to.equal("graph {\n  name: A / source: |\n}");
  });

  it("offers sources, exercise names with quoting, equipment and filters", () => {
    expect(labels("value / source: |")).to.deep.equal(["exercise", "workout", "workout()", "stats"]);
    expect(applied("value / source: |", "exercise")).to.equal("value / source: exercise(|)");
    expect(labels("value / source: exercise(Bench Pr|)")).to.include("Bench Press");
    expect(applied("value / source: exercise(Ben|ch Press) / y: e1rm", "Bench Press")).to.equal(
      "value / source: exercise(Bench Press|) / y: e1rm"
    );
    const second = labels("value / source: exercise(Squat, |)");
    expect(second[0]).to.equal("Barbell");
    expect(second).to.include.members(["program:", "label:", "day:"]);
    expect(labels("value / source: workout(|)")).to.deep.equal(["program:", "day:"]);
    expect(labels("value / source: workout(day: 1, |)")).to.deep.equal(["program:"]);
    expect(labels("value / source: stats(|)")).to.include("weight");
    expect(labels("value / source: stats(weight, |)")).to.deep.equal([]);
  });

  it("offers only the presets that work with the line's source, wherever the source sits", () => {
    expect(labels("value / y: | / source: stats(weight)")).to.deep.equal(["value"]);
    expect(labels("value / source: workout / y: |")).to.deep.equal([
      "volume",
      "muscleSets",
      "muscleVolume",
      "duration",
    ]);
    expect(applied("value / source: workout / y: |", "muscleSets")).to.equal(
      "value / source: workout / y: muscleSets(|)"
    );
    expect(labels("value / source: workout / y: muscleSets(|)")).to.include.members(["chest", "total"]);
  });

  it("offers aggregates with durations, and bare aggregates for a point(x, y) series", () => {
    expect(applied("value / source: workout / group: |", "sum")).to.equal("value / source: workout / group: sum(|)");
    expect(labels("value / source: workout / group: sum(|)")).to.include("1w");
    expect(labels("graph {\n  name: A / source: exercise(Squat) / group: | {~ point(reps[1], 2) ~}\n}")).to.include(
      "max"
    );
    expect(
      at("graph {\n  name: A / source: exercise(Squat) / group: | {~ point(reps[1], 2) ~}\n}")?.options[0].insert
    ).to.equal(undefined);
  });

  it("offers durations, marks, axes and colors for their keys", () => {
    expect(labels("graph / range: |{\n}")).to.deep.equal(["1m", "3m", "6m", "1y", "all"]);
    expect(labels("value / source: workout / trend: |")).to.not.include("all");
    expect(labels("graph {\n  name: A / mark: |\n}")).to.deep.equal(["line", "dots", "bars"]);
    expect(labels("graph {\n  name: A / axis: |\n}")).to.deep.equal(["left", "right"]);
    expect(labels("graph {\n  name: A / color: |\n}")).to.include("purple");
  });

  it("reads a continued line as one line", () => {
    expect(labels("graph {\n  name: A / source: workout \\\n    / y: |\n}")).to.include("muscleSets");
  });

  it("treats every line of an unclosed graph and a graph in a row as series lines", () => {
    expect(labels("graph {\n  name: A\n  |")).to.include("source");
    expect(labels("row {\n  graph {\n    |\n  }\n}")).to.include("name");
  });

  it("completes scripts for the series' source, but not in comments, and muscle groups in strings", () => {
    const text = "graph {\n  name: A / source: workout {~\n    point(volu|)\n  ~}\n}";
    expect(at(text)?.kind).to.equal("script");
    expect(labels(text)).to.include("volume");
    expect(labels("graph {\n  name: A / source: workout {~ // volu| ~}\n}")).to.deep.equal([]);
    expect(labels('graph {\n  name: A / source: workout {~ point(muscleSets("ch|")) ~}\n}')).to.include("chest");
    expect(labels("graph {\n  name: A / source: workout {~ state.best = 1\n point(st|) ~}\n}")).to.include("state");
  });

  it("keeps the popup closed on an empty query unless asked or right after a separator", () => {
    expect(at("|", "popup", false)).to.equal(undefined);
    expect(at("graph {\n  name: A / |\n}", "popup", false)?.kind).to.equal("key");
    expect(at("graph {\n  name: A / mark: |\n}", "popup", false)?.kind).to.equal("enum");
  });

  it("ranks and caps the strip, and offers the next key after a finished value", () => {
    const strip = at("value / source: exercise(squ|)", "strip");
    expect(strip?.options[0].label).to.equal("Squat");
    expect(strip?.options.length).to.be.at.most(30);
    expect(applied("graph {\n  name: A |\n}", "source:", "strip")).to.equal("graph {\n  name: A / source: |\n}");
    expect(at("graph {\n  name: A |\n}", "popup")).to.equal(undefined);
  });

  it("never returns an inverted range, and keeps an existing colon", () => {
    const right = at("value /| source: workout");
    expect(right == null || right.from <= right.to).to.equal(true);
    expect(applied("value / sou|rce: workout", "source")).to.equal("value / source|: workout");
  });

  it("keeps a continuation backslash after the completed value", () => {
    expect(applied("value / source: workout / y: vol|ume \\\n  / compare: 4w", "volume")).to.equal(
      "value / source: workout / y: volume| \\\n  / compare: 4w"
    );
  });

  it("completes inside a quoted exercise name and replaces the whole quoted argument", () => {
    const strip = at('value / source: exercise("Bench Pr|")', "strip");
    expect(strip?.query).to.equal("Bench Pr");
    expect(strip?.options[0].label).to.equal("Bench Press");
    expect(applied('value / source: exercise("Bench Pr|")', "Bench Press", "strip")).to.equal(
      "value / source: exercise(Bench Press|)"
    );
  });

  it("offers bare kinds, not templates, over an existing widget header", () => {
    expect(applied("gra|ph {\n  name: A\n}", "graph")).to.equal("graph| {\n  name: A\n}");
  });

  it("stays on exercise names inside an unfinished call with a space", () => {
    expect(at("value / source: exercise(Bench |", "strip")?.kind).to.equal("exercise");
  });

  it("keeps the default equipment first in both hosts", () => {
    expect(at("value / source: exercise(Squat, |)", "strip")?.options[0].label).to.equal("Barbell");
    const popup = at("value / source: exercise(Squat, |)");
    const barbell = popup?.options.find((o) => o.label === "Barbell");
    const band = popup?.options.find((o) => o.label === "Band");
    expect((barbell?.boost ?? 0) > (band?.boost ?? 0)).to.equal(true);
  });

  it("matches only the text before the caret, while replacing the whole token", () => {
    const completion = at("value / source: workout / y: vol| / compare: 4w");
    expect(completion?.query).to.equal("vol");
    expect(completion?.match.to).to.equal(completion!.from + 3);
    expect(completion?.to).to.equal(completion!.from + 3);
  });

  it("applies a tap to the snapshot once, and never while text is selected", () => {
    const text = "graph {\n  name: A / mark: \n}";
    const pos = text.indexOf("mark: ") + 6;
    const analysis = new LiftographEditorAnalysis(settings);
    const completion = analysis.completions(text, pos, "strip");
    const option = completion!.options.find((o) => o.label === "bars")!;
    const tap = LiftographCompletions_tap({ text, start: pos, end: pos }, completion, option);
    expect(tap?.next.text).to.equal("graph {\n  name: A / mark: bars\n}");
    expect(tap?.next.start).to.equal(pos + 4);
    const again = analysis.completions(tap!.next.text, tap!.next.start, "strip");
    expect(LiftographCompletions_tap(tap!.next, again, option)?.next.text ?? tap!.next.text).to.equal(tap!.next.text);
    expect(LiftographCompletions_tap({ text, start: pos - 3, end: pos }, completion, option)).to.equal(undefined);
  });

  it("refuses to apply an option the caret no longer offers", () => {
    const stale = at("graph {\n  name: A / mark: |\n}");
    const option = stale!.options[0];
    expect(LiftographCompletions_apply(at("graph {\n  name: A / axis: |\n}"), option)).to.equal(undefined);
    expect(LiftographCompletions_apply(undefined, option)).to.equal(undefined);
  });

  it("keeps existing parens and colons when completing a call name or a filter name", () => {
    expect(applied("value / source: exe|rcise(Squat)", "exercise")).to.equal("value / source: exercise|(Squat)");
    expect(applied("value / source: workout(prog|: Test)", "program:")).to.equal(
      "value / source: workout(program|: Test)"
    );
  });

  it("offers argument values only for the key that takes them", () => {
    expect(labels("value / name: sum(|")).to.deep.equal([]);
    expect(labels("value / source: workout / group: sum(|")).to.deep.equal(["1w", "2w", "4w", "1m", "3m"]);
    expect(labels("value / source: workout / smooth: avg(|")).to.include("5");
  });

  it("places the template caret after the name key", () => {
    expect(applied("|", "value")).to.equal("value / name: | / source: exercise() / y: e1rm / compare: 4w");
  });

  it("replaces up to what was typed after the popup opened", () => {
    const completion = at("value / mark: d|")!;
    const option = completion.options.find((o) => o.label === "dots")!;
    expect(LiftographCompletions_editTyped(completion, option, completion.to + 2)).to.deep.include({
      to: completion.to + 2,
      insert: "dots",
    });
  });

  it("completes scripts on the tree CodeMirror builds", () => {
    const text = "value / source: workout {~ point(volu) ~}";
    const state = EditorState.create({
      doc: text,
      extensions: [LiftographLanguage_support(() => LiftographDocument_parse(text))],
    });
    const tree = LiftographLanguage_tree(state);
    const completion = new LiftographEditorAnalysis(settings).completions(
      text,
      text.indexOf("volu") + 4,
      "popup",
      true,
      tree
    );
    expect(completion?.options.map((o) => o.label)).to.include("volume");
  });
});
