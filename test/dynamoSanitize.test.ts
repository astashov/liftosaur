import "mocha";
import { expect } from "chai";
import { DynamoUtil_sanitizeNumbers } from "../lambda/utils/dynamo";

describe("DynamoUtil_sanitizeNumbers", () => {
  it("leaves safe numbers untouched", () => {
    const input = { a: 1, b: -45, c: 2.5, d: Number.MAX_SAFE_INTEGER };
    expect(DynamoUtil_sanitizeNumbers(input)).to.deep.equal(input);
  });

  it("clamps a corrupt plate count buried in nested storage (Rollbar 7281)", () => {
    const input = {
      storage: {
        settings: {
          gyms: [{ equipment: { barbell: { plates: [{ weight: { value: 45 }, num: 6.886666868666669e30 }] } } }],
        },
      },
    };
    const clamped: string[] = [];
    const result = DynamoUtil_sanitizeNumbers(input, clamped);
    expect(result.storage.settings.gyms[0].equipment.barbell.plates[0].num).to.equal(Number.MAX_SAFE_INTEGER);
    expect(clamped).to.have.lengthOf(1);
    expect(clamped[0]).to.contain("plates[0].num");
  });

  it("handles NaN and Infinity", () => {
    expect(DynamoUtil_sanitizeNumbers({ x: NaN }).x).to.equal(0);
    expect(DynamoUtil_sanitizeNumbers({ x: Infinity }).x).to.equal(Number.MAX_SAFE_INTEGER);
    expect(DynamoUtil_sanitizeNumbers({ x: -Infinity }).x).to.equal(-Number.MAX_SAFE_INTEGER);
  });

  it("does not mutate the original object", () => {
    const input = { num: 1e30 };
    DynamoUtil_sanitizeNumbers(input);
    expect(input.num).to.equal(1e30);
  });
});
