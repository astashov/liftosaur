/**
 * Finds plate stacks for an entire exercise, rather than solving each set independently.
 *
 * This module deliberately knows nothing about exercises, equipment settings, or pounds and kilograms. Its caller
 * converts weights to exact integers and assigns each plate type a call-local array index. A stack is an array of those
 * indexes ordered from the bar outward. Thus, two stacks with the same plates in a different order are different: only
 * their common inner prefix can remain on the bar between sets.
 *
 * `initialStacks` is the reliability boundary of the abstraction. The caller provides one known-good stack per target;
 * this module validates those stacks and uses them as a complete fallback plan. Search limits can therefore control
 * CPU and memory without creating a failure mode for the workout: the result is always at least the supplied plan.
 */
export interface IPlateOptimizerLimits {
  /** Bounds auxiliary work before graph search starts. */
  maxDpCells: number;
  maxLowerBoundIterations: number;
  /** Bounds the graph search itself. Reaching any bound returns the best complete plan found so far. */
  maxExpandedStates: number;
  maxStoredStates: number;
  maxQueueSize: number;
}

export interface IPlateOptimizerInput {
  /** Positive integer weights. The array position is the plate's identity for this call only. */
  plateWeights: number[];
  /** Maximum plates of each type available on the one side being optimized. */
  maxPlateCounts: number[];
  /** Required one-sided plate loads, in workout order and in the same integer units as plateWeights. */
  targets: number[];
  /** A feasible complete stack for every target; also the fallback returned if bounded search cannot improve it. */
  initialStacks: number[][];
  limits?: Partial<IPlateOptimizerLimits>;
}

export type IPlateOptimizerOperation = { type: "push"; plateIndex: number } | { type: "pop"; plateIndex: number };

export interface IPlateOptimizerResult {
  /** Complete stacks at each target, ordered from the bar outward. */
  stacks: number[][];
  /** A replayable path from an empty bar through every target and back to empty. */
  operations: IPlateOptimizerOperation[];
  actionCount: number;
  /** False means a resource bound stopped search; it does not mean that the returned plan is incomplete or invalid. */
  searchCompleted: boolean;
  expandedStates: number;
}

// These are responsiveness limits, not parts of the physical plate model. Inventory makes the model finite; the limits
// prevent an unusual custom inventory or workout from monopolizing the UI thread.
const defaultLimits: IPlateOptimizerLimits = {
  maxDpCells: 200000,
  maxLowerBoundIterations: 1000000,
  maxExpandedStates: 50000,
  maxStoredStates: 100000,
  maxQueueSize: 100000,
};

interface ISearchState {
  key: string;
  // A state has satisfied targets [0, targetIndex). The stack is the other half of its identity.
  targetIndex: number;
  stack: number[];
  // The remaining fields are caches derived from stack, except cost (A*'s g) and estimate (g + h).
  counts: number[];
  weight: number;
  cost: number;
  estimate: number;
  order: number;
}

interface IParent {
  key: string;
  operation?: IPlateOptimizerOperation;
}

class MinHeap {
  // A private heap keeps the specialized search self-contained. It supports duplicate entries because A* may discover
  // a cheaper route to a state after that state has already been queued.
  private readonly values: ISearchState[] = [];

  public get size(): number {
    return this.values.length;
  }

  public push(value: ISearchState): void {
    this.values.push(value);
    let index = this.values.length - 1;
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (compareSearchStates(this.values[parentIndex], value) <= 0) {
        break;
      }
      this.values[index] = this.values[parentIndex];
      index = parentIndex;
    }
    this.values[index] = value;
  }

  public pop(): ISearchState | undefined {
    const first = this.values[0];
    const last = this.values.pop();
    if (first == null || last == null || this.values.length === 0) {
      return first;
    }

    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.values.length) {
        break;
      }
      let child = left;
      if (right < this.values.length && compareSearchStates(this.values[right], this.values[left]) < 0) {
        child = right;
      }
      if (compareSearchStates(last, this.values[child]) <= 0) {
        break;
      }
      this.values[index] = this.values[child];
      index = child;
    }
    this.values[index] = last;
    return first;
  }
}

function compareSearchStates(a: ISearchState, b: ISearchState): number {
  if (a.estimate !== b.estimate) {
    return a.estimate - b.estimate;
  }
  // For equal lower bounds, prefer a path that has already done more work. This tends to reach a complete incumbent
  // sooner, which tightens branch-and-bound pruning, but does not affect which plans are legal.
  if (a.cost !== b.cost) {
    return b.cost - a.cost;
  }
  return a.order - b.order;
}

function stateKey(targetIndex: number, stack: number[]): string {
  // Weight or plate counts are insufficient identities: future removal cost depends on the full plate order.
  return `${targetIndex}|${stack.join(",")}`;
}

function commonPrefixLength(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let index = 0;
  while (index < length && a[index] === b[index]) {
    index += 1;
  }
  return index;
}

function buildOperations(stacks: number[][]): IPlateOptimizerOperation[] {
  // The shortest route between two fixed stacks removes the old suffix after their common prefix, then adds the new
  // suffix. Appending [] includes the required final unload in the incumbent's cost.
  const operations: IPlateOptimizerOperation[] = [];
  let current: number[] = [];
  for (const stack of [...stacks, []]) {
    const retained = commonPrefixLength(current, stack);
    for (let index = current.length - 1; index >= retained; index -= 1) {
      operations.push({ type: "pop", plateIndex: current[index] });
    }
    for (let index = retained; index < stack.length; index += 1) {
      operations.push({ type: "push", plateIndex: stack[index] });
    }
    current = stack;
  }
  return operations;
}

function validateInput(input: IPlateOptimizerInput): void {
  // There is no separate reachability calculation here: validating a supplied stack for every target proves
  // reachability and avoids duplicating the application's existing plate-selection logic.
  if (input.plateWeights.length !== input.maxPlateCounts.length) {
    throw new Error("Plate weights and inventory must have the same length");
  }
  if (input.targets.length !== input.initialStacks.length) {
    throw new Error("Every target must have an initial stack");
  }
  for (const weight of input.plateWeights) {
    if (!Number.isSafeInteger(weight) || weight <= 0) {
      throw new Error("Plate weights must be positive safe integers");
    }
  }
  for (const count of input.maxPlateCounts) {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error("Plate inventory must contain non-negative safe integers");
    }
  }
  for (let targetIndex = 0; targetIndex < input.targets.length; targetIndex += 1) {
    const target = input.targets[targetIndex];
    if (!Number.isSafeInteger(target) || target < 0) {
      throw new Error("Targets must be non-negative safe integers");
    }
    const counts = new Array(input.plateWeights.length).fill(0);
    let weight = 0;
    for (const plateIndex of input.initialStacks[targetIndex]) {
      if (!Number.isSafeInteger(plateIndex) || plateIndex < 0 || plateIndex >= input.plateWeights.length) {
        throw new Error("An initial stack refers to an unknown plate");
      }
      counts[plateIndex] += 1;
      if (counts[plateIndex] > input.maxPlateCounts[plateIndex]) {
        throw new Error("An initial stack exceeds plate inventory");
      }
      weight += input.plateWeights[plateIndex];
    }
    if (weight !== target) {
      throw new Error("An initial stack does not match its target");
    }
  }
}

function minimumPlateCounts(maxTarget: number, plateWeights: number[]): number[] {
  // This deliberately ignores inventory and ordering. The relaxed problem can only use fewer plates than the physical
  // problem, so its answer is safe as an A* lower bound even when it is physically impossible.
  const counts = new Array(maxTarget + 1).fill(Infinity);
  counts[0] = 0;
  for (let weight = 1; weight <= maxTarget; weight += 1) {
    for (const plateWeight of plateWeights) {
      if (plateWeight <= weight && counts[weight - plateWeight] !== Infinity) {
        counts[weight] = Math.min(counts[weight], counts[weight - plateWeight] + 1);
      }
    }
  }
  return counts;
}

function transitionLowerBound(from: number, to: number, minimumCounts: number[]): number {
  // Treat each possible retained weight as though both stacks could realize it with an identical prefix. Some cannot;
  // that optimism is intentional, since overestimating here could make A* discard the best real plan.
  let best = Infinity;
  for (let retainedWeight = 0; retainedWeight <= Math.min(from, to); retainedWeight += 1) {
    const removed = minimumCounts[from - retainedWeight];
    const added = minimumCounts[to - retainedWeight];
    if (removed !== Infinity && added !== Infinity) {
      best = Math.min(best, removed + added);
    }
  }
  return best;
}

function lowerBoundToNextTarget(
  stack: number[],
  target: number,
  plateWeights: number[],
  minimumCounts: number[]
): number {
  // Unlike future target pairs, the current stack is known. Examine its actual prefixes; for each one, count the pops
  // needed to expose it and use the relaxed table for the minimum pushes needed afterward.
  let best = Infinity;
  let retainedWeight = 0;
  for (let retained = 0; retained <= stack.length; retained += 1) {
    if (retainedWeight <= target) {
      const platesToAdd = minimumCounts[target - retainedWeight];
      if (platesToAdd !== Infinity) {
        best = Math.min(best, stack.length - retained + platesToAdd);
      }
    }
    if (retained < stack.length) {
      retainedWeight += plateWeights[stack[retained]];
    }
  }
  return best;
}

function reconstruct(
  goalKey: string,
  parents: Map<string, IParent>,
  states: Map<string, Pick<ISearchState, "targetIndex" | "stack">>,
  targetCount: number
): { stacks: number[][]; operations: IPlateOptimizerOperation[] } {
  // Target-advance edges cost nothing and do not change the stack. The stack before such an edge is therefore the
  // complete display stack for the target just satisfied, including repeated targets.
  const keys: string[] = [];
  let key: string | undefined = goalKey;
  while (key != null) {
    keys.push(key);
    key = parents.get(key)?.key;
  }
  keys.reverse();

  const stacks: number[][] = [];
  const operations: IPlateOptimizerOperation[] = [];
  for (let index = 1; index < keys.length; index += 1) {
    const previous = states.get(keys[index - 1]);
    const current = states.get(keys[index]);
    if (previous == null || current == null) {
      throw new Error("Could not reconstruct plate optimizer path");
    }
    const parent = parents.get(keys[index]);
    if (parent?.operation != null) {
      operations.push(parent.operation);
    }
    if (current.targetIndex > previous.targetIndex) {
      stacks.push([...previous.stack]);
    }
  }
  if (stacks.length !== targetCount) {
    throw new Error("Plate optimizer path did not visit every target");
  }
  return { stacks, operations };
}

export function PlateOptimizer_optimize(input: IPlateOptimizerInput): IPlateOptimizerResult {
  validateInput(input);
  const limits = { ...defaultLimits, ...input.limits };
  // Preserve the conventional plan unless search finds a strict improvement. Besides giving bounded search a safe
  // answer, this avoids surprising plate order when optimization would save no actions.
  const incumbentOperations = buildOperations(input.initialStacks);
  let incumbentStacks = input.initialStacks.map((stack) => [...stack]);
  let incumbent = incumbentOperations;
  let incumbentCost = incumbent.length;

  if (input.targets.length === 0) {
    return { stacks: [], operations: [], actionCount: 0, searchCompleted: true, expandedStates: 0 };
  }

  const maxTarget = Math.max(...input.targets);
  if (maxTarget + 1 > limits.maxDpCells) {
    return {
      stacks: incumbentStacks,
      operations: incumbent,
      actionCount: incumbentCost,
      searchCompleted: false,
      expandedStates: 0,
    };
  }

  const minimumCounts = minimumPlateCounts(maxTarget, input.plateWeights);
  // futureLowerBounds[k] covers transitions from target k onward plus unloading the final stack. The cost of reaching
  // target k from the current stack is added separately by heuristic().
  const futureLowerBounds = new Array(input.targets.length).fill(0);
  let futureCost = minimumCounts[input.targets[input.targets.length - 1]];
  let lowerBoundIterations = 0;
  if (futureCost === Infinity) {
    throw new Error("A target is not representable by the relaxed plate system");
  }
  futureLowerBounds[input.targets.length - 1] = futureCost;
  for (let index = input.targets.length - 2; index >= 0; index -= 1) {
    lowerBoundIterations += Math.min(input.targets[index], input.targets[index + 1]) + 1;
    if (lowerBoundIterations > limits.maxLowerBoundIterations) {
      return {
        stacks: incumbentStacks,
        operations: incumbent,
        actionCount: incumbentCost,
        searchCompleted: false,
        expandedStates: 0,
      };
    }
    const transition = transitionLowerBound(input.targets[index], input.targets[index + 1], minimumCounts);
    if (transition === Infinity) {
      throw new Error("A target transition is not representable by the relaxed plate system");
    }
    futureCost += transition;
    futureLowerBounds[index] = futureCost;
  }

  function heuristic(targetIndex: number, stack: number[]): number {
    if (targetIndex === input.targets.length) {
      // Once every target has been recorded, pushing cannot help; each remaining plate must be popped exactly once.
      return stack.length;
    }
    return (
      lowerBoundToNextTarget(stack, input.targets[targetIndex], input.plateWeights, minimumCounts) +
      futureLowerBounds[targetIndex]
    );
  }

  const queue = new MinHeap();
  // bestCosts implements dominance by exact state and permits reopening. Parents and states retain only the currently
  // cheapest path to each key, which is enough to reconstruct a complete improved plan.
  const bestCosts = new Map<string, number>();
  const parents = new Map<string, IParent>();
  const states = new Map<string, Pick<ISearchState, "targetIndex" | "stack">>();
  const startStack: number[] = [];
  const startKey = stateKey(0, startStack);
  const startHeuristic = heuristic(0, startStack);
  let insertionOrder = 0;
  bestCosts.set(startKey, 0);
  states.set(startKey, { targetIndex: 0, stack: startStack });
  queue.push({
    key: startKey,
    targetIndex: 0,
    stack: startStack,
    counts: new Array(input.plateWeights.length).fill(0),
    weight: 0,
    cost: 0,
    estimate: startHeuristic,
    order: insertionOrder,
  });

  let expandedStates = 0;
  let resourceLimitReached = false;
  const plateIndexes = input.plateWeights
    .map((_, index) => index)
    .sort((a, b) => input.plateWeights[b] - input.plateWeights[a] || a - b);

  function addSuccessor(
    current: ISearchState,
    targetIndex: number,
    stack: number[],
    counts: number[],
    weight: number,
    actionCost: number,
    operation?: IPlateOptimizerOperation
  ): void {
    if (resourceLimitReached) {
      return;
    }
    const cost = current.cost + actionCost;
    const key = stateKey(targetIndex, stack);
    const knownCost = bestCosts.get(key);
    // Identical states have identical possible futures, so only their cheapest discovered prefix matters.
    if (knownCost != null && knownCost <= cost) {
      return;
    }
    const remaining = heuristic(targetIndex, stack);
    // The heuristic is optimistic. If even that optimistic completion cannot strictly beat the incumbent, this branch
    // cannot change the user-visible result.
    if (cost + remaining >= incumbentCost) {
      return;
    }
    if (knownCost == null && bestCosts.size >= limits.maxStoredStates) {
      resourceLimitReached = true;
      return;
    }
    if (queue.size >= limits.maxQueueSize) {
      resourceLimitReached = true;
      return;
    }
    bestCosts.set(key, cost);
    parents.set(key, { key: current.key, operation });
    states.set(key, { targetIndex, stack });
    insertionOrder += 1;
    queue.push({
      key,
      targetIndex,
      stack,
      counts,
      weight,
      cost,
      estimate: cost + remaining,
      order: insertionOrder,
    });
  }

  while (queue.size > 0 && !resourceLimitReached) {
    const current = queue.pop()!;
    // Reopening leaves older, more expensive queue entries behind. Ignore them when they eventually reach the top.
    if (bestCosts.get(current.key) !== current.cost) {
      continue;
    }
    if (current.estimate >= incumbentCost) {
      // The heap is ordered by estimate, so no unvisited state can now improve the incumbent.
      break;
    }
    if (expandedStates >= limits.maxExpandedStates) {
      resourceLimitReached = true;
      break;
    }
    expandedStates += 1;

    if (current.targetIndex === input.targets.length && current.stack.length === 0) {
      // A goal removed from the heap is a complete, fully unloaded plan. Updating the incumbent makes all subsequent
      // pruning stronger; the loop then proves that no cheaper frontier state remains.
      const reconstructed = reconstruct(current.key, parents, states, input.targets.length);
      incumbentStacks = reconstructed.stacks;
      incumbent = reconstructed.operations;
      incumbentCost = incumbent.length;
      continue;
    }

    if (current.targetIndex < input.targets.length && current.weight === input.targets[current.targetIndex]) {
      // Recording a completed set changes no plates. Taking this edge immediately is always safe and naturally handles
      // repeated target weights.
      addSuccessor(current, current.targetIndex + 1, current.stack, current.counts, current.weight, 0);
      continue;
    }

    const nextTarget = current.targetIndex < input.targets.length ? input.targets[current.targetIndex] : undefined;
    const shouldPushFirst = nextTarget != null && current.weight < nextTarget;

    const addPop = (): void => {
      if (current.stack.length === 0) {
        return;
      }
      const plateIndex = current.stack[current.stack.length - 1];
      const stack = current.stack.slice(0, -1);
      const counts = [...current.counts];
      counts[plateIndex] -= 1;
      addSuccessor(current, current.targetIndex, stack, counts, current.weight - input.plateWeights[plateIndex], 1, {
        type: "pop",
        plateIndex,
      });
    };

    const addPushes = (): void => {
      if (nextTarget == null) {
        return;
      }
      for (const plateIndex of plateIndexes) {
        if (current.counts[plateIndex] >= input.maxPlateCounts[plateIndex]) {
          continue;
        }
        const weight = current.weight + input.plateWeights[plateIndex];
        // An optimal route to the next target first pops to a retained prefix, then pushes its new suffix. A push above
        // the target would have to be popped before the set and can simply be omitted, so overshoot is never useful.
        if (weight > nextTarget) {
          continue;
        }
        const counts = [...current.counts];
        counts[plateIndex] += 1;
        addSuccessor(current, current.targetIndex, [...current.stack, plateIndex], counts, weight, 1, {
          type: "push",
          plateIndex,
        });
      }
    };

    if (shouldPushFirst) {
      // Successor order affects how quickly a good incumbent is found, not the set of plans searched. Favor the action
      // that moves toward the target; plateIndexes similarly tries larger plates first.
      addPushes();
      addPop();
    } else {
      addPop();
      addPushes();
    }
  }

  return {
    stacks: incumbentStacks,
    operations: incumbent,
    actionCount: incumbentCost,
    searchCompleted: !resourceLimitReached,
    expandedStates,
  };
}
