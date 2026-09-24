import { expect } from "chai";
import {
  IRenderObservation,
  RenderTrace_build,
  RenderTrace_byComponent,
  RenderTrace_byInstance,
  RenderTrace_changedKeys,
  RenderTrace_format,
  RenderTrace_label,
  RenderTrace_matches,
  RenderTrace_remounts,
  RenderTrace_select,
  RenderTrace_target,
  RenderTrace_totalCommits,
} from "../test-render/harness/renderTrace";

function render(mountId: number, component: string, over: Partial<IRenderObservation> = {}): IRenderObservation {
  return {
    kind: "render",
    mountId,
    component,
    target: {},
    changedProps: [],
    didMount: false,
    ...over,
  } as IRenderObservation;
}

describe("RenderTrace", () => {
  describe("build", () => {
    it("counts every commit of one mount, not one record per mount", () => {
      const trace = RenderTrace_build([render(1, "Row"), render(1, "Row"), render(1, "Row")]);
      expect(trace.records).to.have.length(1);
      expect(trace.records[0].commits).to.equal(3);
    });

    it("keeps two mounts of the same label apart", () => {
      const target = { set: "s1" };
      const trace = RenderTrace_build([render(1, "Row", { target }), render(2, "Row", { target })]);
      expect(trace.records.map((r) => r.mountId)).to.deep.equal([1, 2]);
      expect(RenderTrace_byInstance(trace.records)).to.deep.equal({ "Row[set=s1]": 2 });
    });

    it("unions the changed props across commits, sorted", () => {
      const trace = RenderTrace_build([
        render(1, "Row", { changedProps: ["b"] }),
        render(1, "Row", { changedProps: ["a", "b"] }),
      ]);
      expect(trace.records[0].changedProps).to.deep.equal(["a", "b"]);
    });

    it("takes the latest target, so a prop change is not reported under the old label", () => {
      const trace = RenderTrace_build([
        render(1, "Row", { target: { set: "s1" } }),
        render(1, "Row", { target: { set: "s2" } }),
      ]);
      expect(RenderTrace_label(trace.records[0].component, trace.records[0].target)).to.equal("Row[set=s2]");
    });

    it("records an unmount with no render as zero commits", () => {
      const trace = RenderTrace_build([{ kind: "unmount", mountId: 1, component: "Row", target: {} }]);
      expect(trace.records[0].commits).to.equal(0);
      expect(trace.records[0].didUnmount).to.equal(true);
    });

    it("keeps didMount once it is set", () => {
      const trace = RenderTrace_build([render(1, "Row", { didMount: true }), render(1, "Row")]);
      expect(trace.records[0].didMount).to.equal(true);
    });
  });

  describe("target", () => {
    it("prefers the nested ids over the index props", () => {
      const target = RenderTrace_target({ entry: { id: "squat" }, set: { id: "s1" }, entryIndex: 7, setIndex: 9 });
      expect(target).to.deep.equal({ entry: "squat", set: "s1" });
    });

    it("falls back to the indexes when no object is passed", () => {
      expect(RenderTrace_target({ entryIndex: 0, setIndex: 2 })).to.deep.equal({ entry: "0", set: "2" });
    });

    it("reads the mode from type or mode", () => {
      expect(RenderTrace_target({ type: "workout" }).mode).to.equal("workout");
      expect(RenderTrace_target({ mode: "edit" }).mode).to.equal("edit");
    });

    it("ignores props that are neither a string nor a number", () => {
      expect(RenderTrace_target({ name: { deep: true }, entry: [] })).to.deep.equal({});
    });
  });

  describe("label", () => {
    it("names the component alone when nothing identifies the instance", () => {
      expect(RenderTrace_label("Row", {})).to.equal("Row");
    });

    it("orders the parts entry, mode, set", () => {
      expect(RenderTrace_label("Row", { set: "s1", mode: "workout", entry: "squat" })).to.equal(
        "Row[entry=squat, mode=workout, set=s1]"
      );
    });

    it("uses the name only when nothing else identifies the instance", () => {
      expect(RenderTrace_label("Card", { name: "bench" })).to.equal("Card[name=bench]");
      expect(RenderTrace_label("Card", { name: "bench", set: "s1" })).to.equal("Card[set=s1]");
    });
  });

  describe("matches", () => {
    it("matches on the component alone", () => {
      expect(RenderTrace_matches("Row", { set: "s1" }, { component: "Row" })).to.equal(true);
      expect(RenderTrace_matches("Row", { set: "s1" }, { component: "Card" })).to.equal(false);
    });

    it("requires every named target field to be equal", () => {
      expect(RenderTrace_matches("Row", { set: "s1", entry: "squat" }, { set: "s1" })).to.equal(true);
      expect(RenderTrace_matches("Row", { set: "s1", entry: "squat" }, { set: "s2" })).to.equal(false);
    });

    it("does not match a field the target does not carry", () => {
      expect(RenderTrace_matches("Row", {}, { set: "s1" })).to.equal(false);
    });
  });

  describe("select", () => {
    it("drops records that never committed", () => {
      const trace = RenderTrace_build([
        render(1, "Row", { target: { set: "s1" } }),
        { kind: "unmount", mountId: 2, component: "Row", target: { set: "s2" } },
      ]);
      expect(RenderTrace_select(trace, { component: "Row" }).map((r) => r.target.set)).to.deep.equal(["s1"]);
    });
  });

  describe("remounts", () => {
    it("reports an unmount and a mount that committed", () => {
      const trace = RenderTrace_build([
        render(1, "Row", { didMount: true }),
        { kind: "unmount", mountId: 2, component: "Row", target: {} },
        render(3, "Row"),
      ]);
      expect(RenderTrace_remounts(trace).map((r) => r.mountId)).to.deep.equal([1, 2]);
    });
  });

  describe("totals", () => {
    it("sums commits per component", () => {
      const trace = RenderTrace_build([render(1, "Row"), render(1, "Row"), render(2, "Card")]);
      expect(RenderTrace_byComponent(trace.records)).to.deep.equal({ Row: 2, Card: 1 });
      expect(RenderTrace_totalCommits(trace.records)).to.equal(3);
    });
  });

  describe("changedKeys", () => {
    it("reports added, removed and changed keys, sorted", () => {
      expect(RenderTrace_changedKeys({ a: 1, b: 2 }, { b: 3, c: 4 })).to.deep.equal(["a", "b", "c"]);
    });

    it("treats an identical reference as unchanged", () => {
      const shared = { id: 1 };
      expect(RenderTrace_changedKeys({ set: shared }, { set: shared })).to.deep.equal([]);
    });

    it("reports a new object with the same shape as changed", () => {
      expect(RenderTrace_changedKeys({ set: { id: 1 } }, { set: { id: 1 } })).to.deep.equal(["set"]);
    });
  });

  describe("format", () => {
    it("says so when nothing rendered", () => {
      expect(RenderTrace_format([])).to.equal("(nothing)");
    });

    it("names the changed props", () => {
      const trace = RenderTrace_build([render(1, "Row", { target: { set: "s1" }, changedProps: ["onTap"] })]);
      expect(RenderTrace_format(trace.records)).to.equal("Row[set=s1]\n  commits: 1\n  changed props: onTap");
    });

    it("flags a commit no prop change explains", () => {
      const trace = RenderTrace_build([render(1, "Row")]);
      expect(RenderTrace_format(trace.records)).to.contain("props unchanged; cause not identified");
    });
  });
});
