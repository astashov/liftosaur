/* eslint-disable @typescript-eslint/no-explicit-any */
import { act, render, screen } from "@testing-library/react-native";
import type { JSX } from "react";
import { forwardRef, memo, useState } from "react";
import { Text, View } from "react-native";
import { CommitObserver_install, ICommitObserver } from "./commitObserver";
import { RenderTrace_byInstance, RenderTrace_remounts, RenderTrace_select } from "./renderTrace";

function Row(props: { set: { id: string }; entry: { id: string }; type: string }): JSX.Element {
  return <Text>{props.set.id}</Text>;
}
const MemoRow = memo(Row);

function Compared(props: { label: string }): JSX.Element {
  return <Text>{props.label}</Text>;
}
const ComparedRow = memo(Compared, (prev, next) => prev.label === next.label);

const Forwarded = forwardRef<Text, { label: string }>(function Forwarded(props, ref): JSX.Element {
  return <Text ref={ref}>{props.label}</Text>;
});

function Stateful(): JSX.Element {
  const [n, setN] = useState(0);
  (globalThis as any).__bumpStateful = () => setN((v) => v + 1);
  return <Text>{n}</Text>;
}

const stableSet = { id: "s1" };
const stableEntry = { id: "squat" };

function Parent(props: { rowKeySuffix: string }): JSX.Element {
  const [n, setN] = useState(0);
  (globalThis as any).__bumpParent = () => setN((v) => v + 1);
  return (
    <View>
      <Text>{n}</Text>
      <MemoRow key={`a-${props.rowKeySuffix}`} set={stableSet} entry={stableEntry} type="workout" />
      <ComparedRow label={`compared-${n}`} />
      <Forwarded label={`forwarded-${n}`} />
      <Stateful />
    </View>
  );
}

describe("CommitObserver", () => {
  let observer: ICommitObserver;

  beforeEach(() => {
    observer = CommitObserver_install();
  });

  afterEach(() => {
    observer.dispose();
  });

  it("registers the renderer with the devtools hook", () => {
    expect((globalThis as any).__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.size).toBeGreaterThan(0);
  });

  it("keys an instance by the fixture ids, not by the tree position", async () => {
    observer.start();
    await render(<Parent rowKeySuffix="1" />);
    const trace = observer.stop();
    expect(RenderTrace_select(trace, { component: "Row" }).map((r) => r.target)).toEqual([
      { entry: "squat", mode: "workout", set: "s1" },
    ]);
  });

  it("records the parent and skips the memo child that bailed out", async () => {
    await render(<Parent rowKeySuffix="1" />);
    observer.start();
    await act(async () => {
      (globalThis as any).__bumpParent();
    });
    const trace = observer.stop();
    expect(RenderTrace_select(trace, { component: "Parent" })).toHaveLength(1);
    expect(RenderTrace_select(trace, { component: "Row" })).toHaveLength(0);
  });

  it("counts a memo with a custom comparator once, not once per wrapper fiber", async () => {
    await render(<Parent rowKeySuffix="1" />);
    observer.start();
    await act(async () => {
      (globalThis as any).__bumpParent();
    });
    const trace = observer.stop();
    expect(RenderTrace_byInstance(RenderTrace_select(trace, { component: "Compared" }))).toEqual({ Compared: 1 });
  });

  it("sees a forwardRef component render", async () => {
    await render(<Parent rowKeySuffix="1" />);
    observer.start();
    await act(async () => {
      (globalThis as any).__bumpParent();
    });
    const trace = observer.stop();
    expect(RenderTrace_byInstance(RenderTrace_select(trace, { component: "Forwarded" }))).toEqual({ Forwarded: 1 });
  });

  it("counts every commit of one instance, not one record per instance", async () => {
    await render(<Parent rowKeySuffix="1" />);
    observer.start();
    await act(async () => {
      (globalThis as any).__bumpStateful();
    });
    await act(async () => {
      (globalThis as any).__bumpStateful();
    });
    const trace = observer.stop();
    expect(RenderTrace_byInstance(RenderTrace_select(trace, { component: "Stateful" }))).toEqual({ Stateful: 2 });
  });

  it("sees a state-only update, where no prop changed", async () => {
    await render(<Parent rowKeySuffix="1" />);
    observer.start();
    await act(async () => {
      (globalThis as any).__bumpStateful();
    });
    const trace = observer.stop();
    const stateful = RenderTrace_select(trace, { component: "Stateful" });
    expect(stateful).toHaveLength(1);
    expect(stateful[0].changedProps).toEqual([]);
  });

  it("reports a remount when the key changes", async () => {
    await render(<Parent rowKeySuffix="1" />);
    observer.start();
    await screen.rerender(<Parent rowKeySuffix="2" />);
    const trace = observer.stop();
    const remounted = RenderTrace_remounts(trace).filter((x) => x.component === "Row");
    expect(remounted.length).toBeGreaterThan(0);
  });

  it("selects by target, so a neighbouring instance can be excluded", async () => {
    observer.start();
    await render(<Parent rowKeySuffix="1" />);
    const trace = observer.stop();
    expect(RenderTrace_select(trace, { component: "Row", set: "s1" })).toHaveLength(1);
    expect(RenderTrace_select(trace, { component: "Row", set: "s2" })).toHaveLength(0);
  });

  it("refuses overlapping recording windows", () => {
    observer.start();
    expect(() => observer.start()).toThrow("cannot overlap");
  });

  it("fails loudly when no renderer is registered", () => {
    const hook = (globalThis as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    const saved = hook.renderers;
    hook.renderers = new Map();
    expect(() => CommitObserver_install()).toThrow("No React renderer registered");
    hook.renderers = saved;
  });
});
