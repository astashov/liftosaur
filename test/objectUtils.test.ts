import "mocha";
import { expect } from "chai";
import { ObjectUtils_clone } from "../src/utils/object";
import { Program_forceEvaluate, Program_create } from "../src/models/program";
import { Settings_build } from "../src/models/settings";
import { IPlannerProgram } from "../src/types";

describe("ObjectUtils_clone", () => {
  it("clones nested objects and arrays", () => {
    const obj = { a: 1, b: { c: [1, 2, { d: "e" }] }, f: "g" };
    const clone = ObjectUtils_clone(obj);
    expect(clone).to.deep.equal(obj);
    expect(clone).to.not.equal(obj);
    expect(clone.b).to.not.equal(obj.b);
    expect(clone.b.c[2]).to.not.equal(obj.b.c[2]);
  });

  it("mimics JSON semantics for undefined, functions, dates and non-finite numbers", () => {
    const obj = {
      u: undefined,
      fn: () => 1,
      d: new Date("2026-06-06T00:00:00.000Z"),
      n: NaN,
      i: Infinity,
      arr: [undefined, () => 1, 2],
    };
    const clone = ObjectUtils_clone(obj);
    expect(clone).to.deep.equal(JSON.parse(JSON.stringify(obj)));
  });

  it("duplicates shared non-cyclic references like JSON does", () => {
    const shared = { x: 1 };
    const obj = { a: shared, b: shared };
    const clone = ObjectUtils_clone(obj);
    expect(clone.a).to.deep.equal(clone.b);
    expect(clone.a).to.not.equal(clone.b);
  });

  it("clones cyclic structures without throwing", () => {
    const obj: { name: string; self?: unknown; arr: unknown[] } = { name: "a", arr: [] };
    obj.self = obj;
    obj.arr.push(obj);
    const clone = ObjectUtils_clone(obj);
    expect(clone.name).to.equal("a");
    expect(clone.self).to.equal(clone);
    expect(clone.arr[0]).to.equal(clone);
  });

  it("clones an evaluated program with cyclic reuse references", () => {
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
  });
});
