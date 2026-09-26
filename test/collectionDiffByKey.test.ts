import "mocha";
import { expect } from "chai";
import { CollectionUtils_diffByKey } from "../src/utils/collection";

describe("CollectionUtils_diffByKey", () => {
  const keyOf = (r: { id: number }): string => String(r.id);

  it("reports nothing when every item is unchanged", () => {
    const rows = [{ id: 1, notes: "a" }, { id: 2 }];
    const copies = rows.map((r) => ({ ...r }));
    expect(CollectionUtils_diffByKey(rows, copies, keyOf)).to.eql({ changed: [], removedKeys: [] });
  });

  it("reports changed and new items and the removed keys", () => {
    const previous = [{ id: 1, notes: "a" }, { id: 2 }, { id: 3 }];
    const next = [{ id: 1, notes: "b" }, { id: 2 }, { id: 4 }];
    expect(CollectionUtils_diffByKey(previous, next, keyOf)).to.eql({
      changed: [{ id: 1, notes: "b" }, { id: 4 }],
      removedKeys: ["3"],
    });
  });

  it("reports every item as changed when the previous collection is empty", () => {
    const next = [{ id: 1 }];
    expect(CollectionUtils_diffByKey([], next, keyOf)).to.eql({ changed: next, removedKeys: [] });
  });
});
