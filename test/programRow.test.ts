import "mocha";
import { expect } from "chai";
import { basicBeginnerProgram } from "../src/programs/basicBeginnerProgram";
import { IProgram } from "../src/types";
import { ProgramRow_pack, ProgramRow_PACK_THRESHOLD_BYTES, ProgramRow_unpack } from "../lambda/utils/programRow";

function programWithText(bytes: number): IProgram {
  const note = "// Keep the same standard across top sets and back-offs, and log completed repetitions honestly.\n";
  const planner = basicBeginnerProgram.planner!;
  const day = planner.weeks[0].days[0];
  const padded = { ...day, exerciseText: note.repeat(Math.ceil(bytes / note.length)) + day.exerciseText };
  return { ...basicBeginnerProgram, planner: { ...planner, weeks: [{ ...planner.weeks[0], days: [padded] }] } };
}

describe("ProgramRow", () => {
  it("stores a program under the threshold unchanged", () => {
    const packed = ProgramRow_pack(basicBeginnerProgram);
    expect(packed).to.equal(basicBeginnerProgram);
    expect(ProgramRow_unpack(packed)).to.eql(basicBeginnerProgram);
  });

  it("moves the planner of a big program into pz and below the Dynamo item limit", () => {
    const program = programWithText(600 * 1024);
    const packed = ProgramRow_pack(program);
    expect(packed.planner).to.equal(undefined);
    expect(packed.pz).to.be.instanceOf(Uint8Array);
    expect(packed.name).to.equal(program.name);
    expect(Buffer.byteLength(JSON.stringify(packed))).to.be.lessThan(ProgramRow_PACK_THRESHOLD_BYTES);
  });

  it("restores the packed planner exactly", () => {
    const program = programWithText(600 * 1024);
    expect(ProgramRow_unpack(ProgramRow_pack(program))).to.eql(program);
  });

  it("restores pz that came back from Dynamo as a plain Uint8Array", () => {
    const program = programWithText(600 * 1024);
    const packed = ProgramRow_pack(program);
    const fromDynamo = { ...packed, pz: new Uint8Array(packed.pz!) };
    expect(ProgramRow_unpack(fromDynamo)).to.eql(program);
  });
});
