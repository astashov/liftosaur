import "mocha";
import { expect } from "chai";
import { ObjectUtils_clone } from "../src/utils/object";
import { Program_forceEvaluate, Program_create } from "../src/models/program";
import { Settings_build } from "../src/models/settings";
import { IPlannerProgram } from "../src/types";

describe("ObjectUtils_clone", () => {
  describe("deep copying", () => {
    it("clones nested objects and arrays into independent copies", () => {
      const obj = { a: 1, b: { c: [1, 2, { d: "e" }] }, f: "g" };
      const clone = ObjectUtils_clone(obj);
      expect(clone).to.deep.equal(obj);
      expect(clone).to.not.equal(obj);
      expect(clone.b).to.not.equal(obj.b);
      expect(clone.b.c).to.not.equal(obj.b.c);
      expect(clone.b.c[2]).to.not.equal(obj.b.c[2]);
    });

    it("returns primitives and null unchanged", () => {
      expect(ObjectUtils_clone(1)).to.equal(1);
      expect(ObjectUtils_clone("a")).to.equal("a");
      expect(ObjectUtils_clone(true)).to.equal(true);
      expect(ObjectUtils_clone(null)).to.equal(null);
      expect(ObjectUtils_clone(undefined)).to.equal(undefined);
      expect(ObjectUtils_clone(BigInt(10))).to.equal(BigInt(10));
    });

    it("does not mutate the original when the clone is mutated", () => {
      const obj = { a: { b: 1 }, list: [1, 2, 3] };
      const clone = ObjectUtils_clone(obj);
      clone.a.b = 2;
      clone.list.push(4);
      expect(obj.a.b).to.equal(1);
      expect(obj.list).to.deep.equal([1, 2, 3]);
    });
  });

  describe("structuredClone value semantics", () => {
    it("preserves NaN and Infinity instead of nulling them", () => {
      const clone = ObjectUtils_clone({ n: NaN, pi: Infinity, ni: -Infinity, z: -0 });
      expect(Number.isNaN(clone.n)).to.equal(true);
      expect(clone.pi).to.equal(Infinity);
      expect(clone.ni).to.equal(-Infinity);
      expect(Object.is(clone.z, -0)).to.equal(true);
    });

    it("keeps undefined values on object keys and array elements", () => {
      const clone = ObjectUtils_clone({ a: undefined as number | undefined, b: 1, arr: [undefined, 2] });
      expect("a" in clone).to.equal(true);
      expect(clone.a).to.equal(undefined);
      expect(clone.arr.length).to.equal(2);
      expect(clone.arr[0]).to.equal(undefined);
    });

    it("does not call toJSON (a Date stays a Date, not its ISO string)", () => {
      const clone = ObjectUtils_clone({ d: new Date("2026-06-06T00:00:00.000Z") });
      expect(clone.d).to.be.instanceOf(Date);
      expect(clone.d.getTime()).to.equal(new Date("2026-06-06T00:00:00.000Z").getTime());
    });

    it("clones Date into an independent instance", () => {
      const original = new Date("2026-01-02T03:04:05.000Z");
      const clone = ObjectUtils_clone({ d: original });
      expect(clone.d).to.not.equal(original);
      expect(clone.d.getTime()).to.equal(original.getTime());
    });

    it("clones RegExp preserving source and flags", () => {
      const re = /ab.c/gi;
      const clone = ObjectUtils_clone({ re });
      expect(clone.re).to.be.instanceOf(RegExp);
      expect(clone.re).to.not.equal(re);
      expect(clone.re.source).to.equal("ab.c");
      expect(clone.re.flags).to.equal("gi");
    });

    it("clones Map deeply, including object keys and values", () => {
      const key = { id: 1 };
      const map = new Map<unknown, unknown>([
        ["a", { v: 1 }],
        [key, [1, 2]],
      ]);
      const clone = ObjectUtils_clone({ map }).map;
      expect(clone).to.be.instanceOf(Map);
      expect(clone).to.not.equal(map);
      expect(clone.get("a")).to.deep.equal({ v: 1 });
      expect(clone.get("a")).to.not.equal(map.get("a"));
      const clonedKey = Array.from(clone.keys()).find((k) => typeof k === "object") as { id: number };
      expect(clonedKey).to.deep.equal({ id: 1 });
      expect(clonedKey).to.not.equal(key);
      expect(clone.get(clonedKey)).to.deep.equal([1, 2]);
    });

    it("clones Set deeply", () => {
      const inner = { v: 1 };
      const set = new Set<unknown>([1, inner]);
      const clone = ObjectUtils_clone({ set }).set;
      expect(clone).to.be.instanceOf(Set);
      expect(clone).to.not.equal(set);
      expect(clone.has(1)).to.equal(true);
      const clonedInner = Array.from(clone).find((v) => typeof v === "object") as { v: number };
      expect(clonedInner).to.deep.equal({ v: 1 });
      expect(clonedInner).to.not.equal(inner);
    });

    it("clones ArrayBuffer and typed array views over an independent buffer", () => {
      const ints = new Int32Array([1, 2, 3]);
      const clone = ObjectUtils_clone({ ints }).ints;
      expect(clone).to.be.instanceOf(Int32Array);
      expect(clone).to.not.equal(ints);
      expect(Array.from(clone)).to.deep.equal([1, 2, 3]);
      clone[0] = 99;
      expect(ints[0]).to.equal(1);
    });

    it("ignores symbol-keyed properties", () => {
      const sym = Symbol("s");
      const obj = { a: 1, [sym]: 2 };
      const clone = ObjectUtils_clone(obj);
      expect(clone.a).to.equal(1);
      expect((clone as { [k: symbol]: unknown })[sym]).to.equal(undefined);
    });

    it("drops function and symbol values instead of throwing", () => {
      const obj = { keep: 1, fn: () => 1, sym: Symbol("x"), arr: [1, () => 2, 3] };
      const clone = ObjectUtils_clone(obj);
      expect(clone.keep).to.equal(1);
      expect("fn" in clone).to.equal(false);
      expect("sym" in clone).to.equal(false);
      expect(clone.arr.length).to.equal(3);
      expect(clone.arr[1]).to.equal(undefined);
    });
  });

  describe("shared references and cycles", () => {
    it("preserves shared (non-cyclic) references instead of duplicating them", () => {
      // This is the property that fixes the crash: a value reused many times clones once and
      // stays shared. Duplicating it is what blew JSON.stringify past the max string length on
      // evaluated programs, where one reused exercise is inlined into hundreds of exercises.
      const shared = { x: 1 };
      const obj = { a: shared, b: shared, list: [shared, shared] };
      const clone = ObjectUtils_clone(obj);
      expect(clone.a).to.equal(clone.b);
      expect(clone.list[0]).to.equal(clone.a);
      expect(clone.list[1]).to.equal(clone.a);
      expect(clone.a).to.not.equal(shared);
      expect(clone.a.x).to.equal(1);
    });

    it("clones self-referential cycles without throwing", () => {
      const obj: { name: string; self?: unknown; arr: unknown[] } = { name: "a", arr: [] };
      obj.self = obj;
      obj.arr.push(obj);
      const clone = ObjectUtils_clone(obj);
      expect(clone.name).to.equal("a");
      expect(clone.self).to.equal(clone);
      expect(clone.arr[0]).to.equal(clone);
    });

    it("clones mutual cycles, preserving the cross references", () => {
      const a: { name: string; other?: unknown } = { name: "a" };
      const b: { name: string; other?: unknown } = { name: "b", other: a };
      a.other = b;
      const clone = ObjectUtils_clone({ a, b });
      expect(clone.a.name).to.equal("a");
      expect(clone.b.name).to.equal("b");
      expect(clone.a.other).to.equal(clone.b);
      expect(clone.b.other).to.equal(clone.a);
    });

    it("does not blow up on heavily shared graphs that JSON.stringify cannot serialize", () => {
      // 40 exercises that all share the same ~deep `reused` object. JSON.stringify would
      // expand the shared subtree once per reference; structuredClone-style cloning keeps it
      // shared, so the result is small and the clone is fast.
      const reused = { sets: Array.from({ length: 50 }, (_, i) => ({ reps: i, weight: { value: i, unit: "lb" } })) };
      const program = { exercises: Array.from({ length: 40 }, (_, i) => ({ id: i, reuse: { exercise: reused } })) };
      const clone = ObjectUtils_clone(program);
      const sharedTargets = new Set(clone.exercises.map((e) => e.reuse.exercise));
      expect(sharedTargets.size).to.equal(1);
      expect(clone.exercises[0].reuse.exercise).to.not.equal(reused);
      expect(clone.exercises[0].reuse.exercise.sets[10].reps).to.equal(10);
    });
  });

  describe("parity with native structuredClone", () => {
    it("matches structuredClone for cloneable data, including shared refs and cycles", () => {
      const shared = { tag: "shared", nums: [1, 2, 3] };
      const obj: Record<string, unknown> = {
        n: 1,
        s: "str",
        bool: true,
        nul: null,
        und: undefined,
        nan: NaN,
        inf: Infinity,
        date: new Date("2026-03-04T05:06:07.000Z"),
        re: /x/gi,
        map: new Map<unknown, unknown>([["k", shared]]),
        set: new Set<unknown>([1, shared]),
        arr: [shared, shared, [undefined, 2]],
        a: shared,
        b: shared,
      };
      obj.self = obj;

      const mine = ObjectUtils_clone(obj) as Record<string, unknown>;
      const native = structuredClone(obj) as Record<string, unknown>;

      const normalize = (root: Record<string, unknown>): unknown => {
        const ids = new WeakMap<object, number>();
        let next = 0;
        const walk = (v: unknown): unknown => {
          if (v === null || typeof v !== "object") {
            return typeof v === "number" && Number.isNaN(v) ? "NaN" : v;
          }
          const seenId = ids.get(v);
          if (seenId != null) {
            return { $ref: seenId };
          }
          const id = next;
          next += 1;
          ids.set(v, id);
          if (v instanceof Date) {
            return { $id: id, date: v.getTime() };
          }
          if (v instanceof RegExp) {
            return { $id: id, re: `${v.source}/${v.flags}` };
          }
          if (v instanceof Map) {
            return { $id: id, map: Array.from(v.entries()).map(([k, val]) => [walk(k), walk(val)]) };
          }
          if (v instanceof Set) {
            return { $id: id, set: Array.from(v.values()).map(walk) };
          }
          if (Array.isArray(v)) {
            return { $id: id, arr: v.map(walk) };
          }
          return { $id: id, obj: Object.keys(v).map((k) => [k, walk((v as Record<string, unknown>)[k])]) };
        };
        return walk(root);
      };

      expect(normalize(mine)).to.deep.equal(normalize(native));
      // structuredClone keeps the cycle and the sharing; so should we.
      expect(mine.self).to.equal(mine);
      expect(mine.a).to.equal(mine.b);
      expect((mine.arr as unknown[])[0]).to.equal(mine.a);
    });
  });

  describe("evaluated programs", () => {
    it("clones an evaluated program whose reuse references JSON.stringify cannot serialize", () => {
      const planner: IPlannerProgram = {
        name: "Test",
        weeks: [
          {
            name: "Week 1",
            days: [
              {
                name: "Day 1",
                exerciseText: `// ...Bench Press
Bench Press / 1x5 100lb`,
              },
            ],
          },
        ],
      } as IPlannerProgram;
      const settings = Settings_build();
      const evaluated = Program_forceEvaluate({ ...Program_create("Temp"), planner }, settings);
      expect(() => JSON.stringify(evaluated)).to.throw();
      const clone = ObjectUtils_clone(evaluated);
      expect(clone.weeks[0].days[0].exercises[0].fullName).to.equal("Bench Press");
      expect(clone).to.not.equal(evaluated);
      expect(clone.weeks[0].days[0].exercises[0]).to.not.equal(evaluated.weeks[0].days[0].exercises[0]);
    });
  });
});
