import "mocha";
import { expect } from "chai";
import { IPlateOptimizerResult, PlateOptimizer_optimize } from "../src/models/plateOptimizer";

function stackWeight(stack: number[], plateWeights: number[]): number {
  return stack.reduce((total, plateIndex) => total + plateWeights[plateIndex], 0);
}

function verifyResult(
  result: IPlateOptimizerResult,
  plateWeights: number[],
  maxPlateCounts: number[],
  targets: number[]
): void {
  expect(result.stacks.map((stack) => stackWeight(stack, plateWeights))).to.eql(targets);
  for (const stack of result.stacks) {
    const counts = new Array(plateWeights.length).fill(0);
    for (const plateIndex of stack) {
      counts[plateIndex] += 1;
      expect(counts[plateIndex]).to.be.at.most(maxPlateCounts[plateIndex]);
    }
  }

  const stack: number[] = [];
  const counts = new Array(plateWeights.length).fill(0);
  let targetIndex = 0;
  const consumeTargets = (): void => {
    const weight = stackWeight(stack, plateWeights);
    while (targetIndex < targets.length && weight === targets[targetIndex]) {
      targetIndex += 1;
    }
  };
  consumeTargets();
  for (const operation of result.operations) {
    if (operation.type === "push") {
      stack.push(operation.plateIndex);
      counts[operation.plateIndex] += 1;
      expect(counts[operation.plateIndex]).to.be.at.most(maxPlateCounts[operation.plateIndex]);
    } else {
      expect(stack[stack.length - 1]).to.equal(operation.plateIndex);
      stack.pop();
      counts[operation.plateIndex] -= 1;
    }
    consumeTargets();
  }
  expect(targetIndex).to.equal(targets.length);
  expect(stack).to.eql([]);
  expect(result.actionCount).to.equal(result.operations.length);
}

function commonPrefixLength(a: number[], b: number[]): number {
  let index = 0;
  while (index < a.length && index < b.length && a[index] === b[index]) {
    index += 1;
  }
  return index;
}

function distance(a: number[], b: number[]): number {
  return a.length + b.length - 2 * commonPrefixLength(a, b);
}

function enumerateStacks(plateWeights: number[], maxPlateCounts: number[]): number[][] {
  const result: number[][] = [];
  const counts = new Array(plateWeights.length).fill(0);
  const stack: number[] = [];
  const visit = (): void => {
    result.push([...stack]);
    for (let plateIndex = 0; plateIndex < plateWeights.length; plateIndex += 1) {
      if (counts[plateIndex] < maxPlateCounts[plateIndex]) {
        counts[plateIndex] += 1;
        stack.push(plateIndex);
        visit();
        stack.pop();
        counts[plateIndex] -= 1;
      }
    }
  };
  visit();
  return result;
}

function exhaustiveCost(plateWeights: number[], maxPlateCounts: number[], targets: number[]): number {
  const stacks = enumerateStacks(plateWeights, maxPlateCounts);
  let previous = new Map<string, { stack: number[]; cost: number }>();
  previous.set("", { stack: [], cost: 0 });
  for (const target of targets) {
    const candidates = stacks.filter((stack) => stackWeight(stack, plateWeights) === target);
    const next = new Map<string, { stack: number[]; cost: number }>();
    for (const candidate of candidates) {
      let best = Infinity;
      for (const value of previous.values()) {
        best = Math.min(best, value.cost + distance(value.stack, candidate));
      }
      next.set(candidate.join(","), { stack: candidate, cost: best });
    }
    previous = next;
  }
  let best = Infinity;
  for (const value of previous.values()) {
    best = Math.min(best, value.cost + value.stack.length);
  }
  return best;
}

function firstStackForTarget(plateWeights: number[], maxPlateCounts: number[], target: number): number[] {
  const stack = enumerateStacks(plateWeights, maxPlateCounts).find(
    (candidate) => stackWeight(candidate, plateWeights) === target
  );
  if (stack == null) {
    throw new Error(`No stack found for target ${target}`);
  }
  return stack;
}

function descendingStackForTarget(plateWeights: number[], maxPlateCounts: number[], target: number): number[] {
  const counts = new Array(plateWeights.length).fill(0);
  const search = (plateIndex: number, remaining: number): boolean => {
    if (plateIndex === plateWeights.length) {
      return remaining === 0;
    }
    const maxCount = Math.min(maxPlateCounts[plateIndex], Math.floor(remaining / plateWeights[plateIndex]));
    for (let count = maxCount; count >= 0; count -= 1) {
      counts[plateIndex] = count;
      if (search(plateIndex + 1, remaining - count * plateWeights[plateIndex])) {
        return true;
      }
    }
    counts[plateIndex] = 0;
    return false;
  };
  if (!search(0, target)) {
    throw new Error(`No descending stack found for target ${target}`);
  }
  return counts.flatMap((count, plateIndex) => new Array(count).fill(plateIndex));
}

describe("PlateOptimizer", () => {
  it("orders plates to save actions across increasing targets", () => {
    const plateWeights = [10, 5, 2];
    const maxPlateCounts = [1, 1, 1];
    const targets = [12, 17];
    const result = PlateOptimizer_optimize({
      plateWeights,
      maxPlateCounts,
      targets,
      initialStacks: [
        [0, 2],
        [0, 1, 2],
      ],
    });

    verifyResult(result, plateWeights, maxPlateCounts, targets);
    expect(result.actionCount).to.equal(6);
    expect(result.stacks).to.eql([
      [0, 2],
      [0, 2, 1],
    ]);
    expect(result.searchCompleted).to.equal(true);
  });

  it("handles decreases and repeated targets", () => {
    const plateWeights = [10, 5, 2];
    const maxPlateCounts = [1, 1, 1];
    const targets = [17, 12, 12];
    const result = PlateOptimizer_optimize({
      plateWeights,
      maxPlateCounts,
      targets,
      initialStacks: [
        [0, 1, 2],
        [0, 2],
        [0, 2],
      ],
    });

    verifyResult(result, plateWeights, maxPlateCounts, targets);
    expect(result.actionCount).to.equal(6);
    expect(result.stacks[1]).to.eql(result.stacks[2]);
  });

  it("returns the valid incumbent when a resource limit is reached", () => {
    const plateWeights = [10, 5, 2];
    const maxPlateCounts = [1, 1, 1];
    const targets = [12, 17];
    const initialStacks = [
      [0, 2],
      [0, 1, 2],
    ];
    const result = PlateOptimizer_optimize({
      plateWeights,
      maxPlateCounts,
      targets,
      initialStacks,
      limits: { maxExpandedStates: 0 },
    });

    verifyResult(result, plateWeights, maxPlateCounts, targets);
    expect(result.searchCompleted).to.equal(false);
    expect(result.stacks).to.eql(initialStacks);
    expect(result.actionCount).to.equal(8);
  });

  it("rejects an initial stack that is not physically feasible", () => {
    expect(() =>
      PlateOptimizer_optimize({
        plateWeights: [10],
        maxPlateCounts: [1],
        targets: [20],
        initialStacks: [[0, 0]],
      })
    ).to.throw("exceeds plate inventory");
  });

  it("matches exhaustive shortest paths for small deterministic problems", () => {
    const fixtures = [
      { plateWeights: [3, 2, 1], maxPlateCounts: [1, 1, 1], targets: [4, 6, 5] },
      { plateWeights: [4, 3, 1], maxPlateCounts: [1, 1, 2], targets: [5, 8, 4] },
      { plateWeights: [5, 2], maxPlateCounts: [1, 2], targets: [4, 7, 4] },
      { plateWeights: [3, 1], maxPlateCounts: [2, 2], targets: [0, 4, 4, 6] },
    ];

    for (const fixture of fixtures) {
      const initialStacks = fixture.targets.map((target) =>
        firstStackForTarget(fixture.plateWeights, fixture.maxPlateCounts, target)
      );
      const result = PlateOptimizer_optimize({ ...fixture, initialStacks });
      verifyResult(result, fixture.plateWeights, fixture.maxPlateCounts, fixture.targets);
      expect(result.actionCount, JSON.stringify(fixture)).to.equal(
        exhaustiveCost(fixture.plateWeights, fixture.maxPlateCounts, fixture.targets)
      );
    }
  });

  it("returns an empty plan for an empty target sequence", () => {
    const result = PlateOptimizer_optimize({
      plateWeights: [10],
      maxPlateCounts: [1],
      targets: [],
      initialStacks: [],
    });
    expect(result).to.eql({ stacks: [], operations: [], actionCount: 0, searchCompleted: true, expandedStates: 0 });
  });

  it("completes an advanced pound sequence with the default gym inventory", () => {
    // Units are 1.25lb after GCD reduction: 45, 25, 10, 5, 2.5 and 1.25lb plates.
    const plateWeights = [36, 20, 8, 4, 2, 1];
    const maxPlateCounts = [4, 2, 2, 2, 2, 1];
    // Total bar weights: 45, 135, 225, 315, 405, 495, 455 and 495lb.
    const targets = [0, 36, 72, 108, 144, 180, 164, 180];
    const initialStacks = targets.map((target) => descendingStackForTarget(plateWeights, maxPlateCounts, target));
    const baselineActions = initialStacks.reduce(
      (total, stack, index) => total + distance(index === 0 ? [] : initialStacks[index - 1], stack),
      initialStacks[initialStacks.length - 1].length
    );
    const result = PlateOptimizer_optimize({ plateWeights, maxPlateCounts, targets, initialStacks });

    verifyResult(result, plateWeights, maxPlateCounts, targets);
    expect(result.searchCompleted).to.equal(true);
    expect(result.actionCount).to.be.at.most(baselineActions);
  });

  it("completes an advanced kilogram sequence with the default gym inventory", () => {
    // Units are 0.25kg after GCD reduction: 20, 10, 5, 2.5, 1.25 and 0.5kg plates.
    const plateWeights = [80, 40, 20, 10, 5, 2];
    const maxPlateCounts = [4, 2, 2, 2, 2, 1];
    // Total bar weights: 20, 60, 100, 140, 180, 220, 180 and 220kg.
    const targets = [0, 80, 160, 240, 320, 400, 320, 400];
    const initialStacks = targets.map((target) => descendingStackForTarget(plateWeights, maxPlateCounts, target));
    const result = PlateOptimizer_optimize({ plateWeights, maxPlateCounts, targets, initialStacks });

    verifyResult(result, plateWeights, maxPlateCounts, targets);
    expect(result.searchCompleted).to.equal(true);
  });

  it("handles an elite expanded inventory within the configured bound", () => {
    const plateWeights = [36, 20, 8, 4, 2, 1];
    const maxPlateCounts = [12, 2, 2, 2, 2, 1];
    // Reaches an 855lb total bar weight before a back-off set.
    const targets = [0, 72, 144, 216, 288, 324, 288];
    const initialStacks = targets.map((target) => descendingStackForTarget(plateWeights, maxPlateCounts, target));
    const result = PlateOptimizer_optimize({
      plateWeights,
      maxPlateCounts,
      targets,
      initialStacks,
      limits: { maxExpandedStates: 10 },
    });

    verifyResult(result, plateWeights, maxPlateCounts, targets);
    expect(result.expandedStates).to.be.at.most(10);
  });
});
