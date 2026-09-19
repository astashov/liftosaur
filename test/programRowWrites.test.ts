import "mocha";
import { expect } from "chai";
import { IProgram } from "../src/types";
import { ProgramRowWrites_plan } from "../lambda/utils/programRowWrites";

function program(id: string, clonedAt?: number): IProgram {
  return { id, clonedAt, name: id } as IProgram;
}

describe("ProgramRowWrites_plan", () => {
  it("deletes a stored row whose clonedAt is tombstoned", () => {
    const plan = ProgramRowWrites_plan([program("a", 1), program("b", 2)], [program("b", 2)], [1]);
    expect(plan.idsToDelete).to.deep.equal(["a"]);
    expect(plan.programsToPut.map((p) => p.id)).to.deep.equal(["b"]);
  });

  it("keeps the row when a merged program reuses the id with a live clonedAt", () => {
    const plan = ProgramRowWrites_plan([program("fcezcueu", 1)], [program("fcezcueu", 2)], [1]);
    expect(plan.idsToDelete).to.deep.equal([]);
    expect(plan.programsToPut.map((p) => p.clonedAt)).to.deep.equal([2]);
  });

  it("drops a merged program whose own clonedAt is tombstoned", () => {
    const plan = ProgramRowWrites_plan([program("a", 1)], [program("a", 1)], [1]);
    expect(plan.idsToDelete).to.deep.equal(["a"]);
    expect(plan.programsToPut).to.deep.equal([]);
  });

  it("puts a program without clonedAt and never deletes a row without one", () => {
    const plan = ProgramRowWrites_plan([program("a")], [program("a")], [1]);
    expect(plan.idsToDelete).to.deep.equal([]);
    expect(plan.programsToPut.map((p) => p.id)).to.deep.equal(["a"]);
  });
});
