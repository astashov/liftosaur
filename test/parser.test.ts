import { Weight } from "../src/models/weight";
import { ParserTestUtils } from "../src/utils/parserTestUtils";

describe("Parser", () => {
  it("r[]", () => {
    const result = ParserTestUtils.run("r[state.foo]", { foo: 2 });
    expect(result).toEqual(2);
  });

  it("completedReps >= reps", () => {
    const state = { foo: 2 };
    ParserTestUtils.run(
      `if (completedReps >= reps) {
        state.foo = state.foo + 3
      }`,
      state
    );
    expect(state.foo).toEqual(5);
  });

  it("ternary", () => {
    expect(ParserTestUtils.run(`state.foo > 3 ? state.foo < 7 ? 4 : 5 : 6`, { foo: 2 })).toEqual(6);
    expect(ParserTestUtils.run(`state.foo > 3 ? state.foo < 7 ? 4 : 5 : 6`, { foo: 4 })).toEqual(4);
    expect(ParserTestUtils.run(`state.foo > 3 ? state.foo < 7 ? 4 : 5 : 6`, { foo: 8 })).toEqual(5);
  });

  it("Standard progression and deload", () => {
    const program = `
// Simple Exercise Progression script '5lb,2'
if (completedReps >= reps) {
  state.successes = state.successes + 1
  if (state.successes >= 2) {
    state.weight = state.weight + 5lb
    state.successes = 0
    state.failures = 0
  }
}
// End Simple Exercise Progression script
// Simple Exercise Deload script '5lb,1'
if (!(completedReps >= reps)) {
  state.failures = state.failures + 1
  if (state.failures >= 1) {
    state.weight = state.weight - 5lb
    state.successes = 0
    state.failures = 0
  }
}
// End Simple Exercise Deload script`;
    let state = {
      successes: 0,
      failures: 0,
      weight: Weight.build(150, "lb"),
    };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [
          [3, 3, 150],
          [3, 3, 150],
          [3, 3, 150],
        ],
      })
    );
    expect(state).toEqual({ successes: 1, failures: 0, weight: Weight.build(150, "lb") });

    state = {
      successes: 2,
      failures: 0,
      weight: Weight.build(150, "lb"),
    };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [
          [3, 3, 150],
          [3, 3, 150],
          [3, 3, 150],
        ],
      })
    );
    expect(state).toEqual({ successes: 0, failures: 0, weight: Weight.build(155, "lb") });

    state = {
      successes: 1,
      failures: 2,
      weight: Weight.build(150, "lb"),
    };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [
          [3, 3, 150],
          [3, 3, 150],
          [3, 2, 150],
        ],
      })
    );
    expect(state).toEqual({ successes: 0, failures: 0, weight: Weight.build(145, "lb") });
  });

  it("Basic beginner", () => {
    const program = `
    if (cr[1] + cr[2] + cr[3] >= 15) {
      state.weight = w[3] +
        (cr[3] > 10 ? 5lb : 2.5lb)
    } else {
      state.weight = state.weight * 0.9
    }
    `;
    let state = { weight: Weight.build(150, "lb") };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
        ],
      })
    );
    expect(state).toEqual({ weight: Weight.build(152.5, "lb") });

    state = { weight: Weight.build(150, "lb") };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 11, 150],
        ],
      })
    );
    expect(state).toEqual({ weight: Weight.build(155, "lb") });

    state = { weight: Weight.build(150, "lb") };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 3, 150],
        ],
      })
    );
    expect(state).toEqual({ weight: Weight.build(135, "lb") });
  });

  it("Basic beginner", () => {
    const program = `
    if (cr[1] + cr[2] + cr[3] >= 15) {
      state.weight = w[3] +
        (cr[3] > 10 ? 5lb : 2.5lb)
    } else {
      state.weight = state.weight * 0.9
    }
    `;
    let state = { weight: Weight.build(150, "lb") };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
        ],
      })
    );
    expect(state).toEqual({ weight: Weight.build(152.5, "lb") });

    state = { weight: Weight.build(150, "lb") };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 11, 150],
        ],
      })
    );
    expect(state).toEqual({ weight: Weight.build(155, "lb") });

    state = { weight: Weight.build(150, "lb") };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 3, 150],
        ],
      })
    );
    expect(state).toEqual({ weight: Weight.build(135, "lb") });
  });

  it("GZCLP", () => {
    const program = `
    if (cr >= r) {
      state.weight = w[5] + 10lb
    } else if (state.stage < 3) {
      state.stage = state.stage + 1
    } else {
      state.stage = 1
      state.weight = state.weight * 0.85
    }
    `;
    let state = { stage: 1, weight: Weight.build(150, "lb") };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
        ],
      })
    );
    expect(state).toEqual({ stage: 1, weight: Weight.build(160, "lb") });

    state = { stage: 1, weight: Weight.build(150, "lb") };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
          [5, 4, 150],
        ],
      })
    );
    expect(state).toEqual({ stage: 2, weight: Weight.build(150, "lb") });

    state = { stage: 3, weight: Weight.build(150, "lb") };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
          [5, 4, 150],
        ],
      })
    );
    expect(state).toEqual({ stage: 1, weight: Weight.build(127.5, "lb") });
  });

  it("condition with numbers", () => {
    const program = `
    if (cr[3] >= 25) {
      state.weight = state.weight + 5lb
    }
    `;
    let state = { weight: Weight.build(150, "lb") };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 30, 150],
        ],
      })
    );
    expect(state).toEqual({ weight: Weight.build(155, "lb") });

    state = { weight: Weight.build(150, "lb") };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
        ],
      })
    );
    expect(state).toEqual({ weight: Weight.build(150, "lb") });
  });

  it("SBS", () => {
    const program = `
    if (state.week != 7 && state.week != 14 && state.week != 21) {
      if (completedReps[4] > reps[4] + 4) {
        state.tm = state.tm * 1.03
      } else if (completedReps[4] < reps[4] - 1) {
        state.tm = state.tm * 0.95
      } else if (completedReps[4] < reps[4]) {
        state.tm = state.tm * 0.98
      } else if (completedReps[4] > reps[4]) {
        state.tm = state.tm * (1.0 + ((completedReps[4] - reps[4]) * 0.005))
      }
    }
    
    state.week = state.week + 1
    if (state.week > 21) {
      state.week = 1
    }
    
    if (state.week == 2) { state.intensity = 72.5 }
    if (state.week == 3) { state.intensity = 75 }
    if (state.week == 4) { state.intensity = 72.5 }
    if (state.week == 5) { state.intensity = 75 }
    if (state.week == 6) { state.intensity = 77.5 }
    if (state.week == 7) { state.intensity = 60 }
    if (state.week == 8) { state.intensity = 72.5 }
    if (state.week == 9) { state.intensity = 75 }
    if (state.week == 10) { state.intensity = 77.5 }
    if (state.week == 11) { state.intensity = 75 }
    if (state.week == 12) { state.intensity = 77.5 }
    if (state.week == 13) { state.intensity = 80 }
    if (state.week == 14) { state.intensity = 60 }
    if (state.week == 15) { state.intensity = 75 }
    if (state.week == 16) { state.intensity = 77.5 }
    if (state.week == 17) { state.intensity = 80 }
    if (state.week == 18) { state.intensity = 77.5 }
    if (state.week == 19) { state.intensity = 80 }
    if (state.week == 20) { state.intensity = 82.5 }
    if (state.week == 21) { state.intensity = 60 }
    
    if (state.intensity > 95) { state.lastrep = 1 }
    else if (state.intensity > 90) { state.lastrep = 2 }
    else if (state.intensity > 87.5) { state.lastrep = 3 }
    else if (state.intensity > 85) { state.lastrep = 4 }
    else if (state.intensity > 82.5) { state.lastrep = 5 }
    else if (state.intensity > 80) { state.lastrep = 6 }
    else if (state.intensity > 77.5) { state.lastrep = 8 }
    else if (state.intensity > 75) { state.lastrep = 9 }
    else if (state.intensity > 72.5) { state.lastrep = 10 }
    else if (state.intensity > 70) { state.lastrep = 11 }
    else if (state.intensity > 67.5) { state.lastrep = 12 }
    else if (state.intensity > 65) { state.lastrep = 13 }
    else if (state.intensity > 62.5) { state.lastrep = 15 }
    else if (state.intensity > 60) { state.lastrep = 16 }
    else if (state.intensity > 57.5) { state.lastrep = 18 }
    else if (state.intensity > 55) { state.lastrep = 19 }
    else if (state.intensity > 52.5) { state.lastrep = 21 }
    else if (state.intensity > 50) { state.lastrep = 23 }
    else { state.lastrep = 25 }
    
    if (state.intensity > 95) { state.reps = 1 }
    else if (state.intensity > 87.5) { state.reps = 2 }
    else if (state.intensity > 85) { state.reps = 3 }
    else if (state.intensity > 82.5) { state.reps = 4 }
    else if (state.intensity > 80) { state.reps = 5 }
    else if (state.intensity > 77.5) { state.reps = 6 }
    else if (state.intensity > 75) { state.reps = 7 }
    else if (state.intensity > 72.5) { state.reps = 8 }
    else if (state.intensity > 70) { state.reps = 9 }
    else if (state.intensity > 67.5) { state.reps = 10 }
    else if (state.intensity > 65) { state.reps = 11 }
    else if (state.intensity > 62.5) { state.reps = 12 }
    else if (state.intensity > 60) { state.reps = 13 }
    else if (state.intensity > 57.5) { state.reps = 14 }
    else if (state.intensity > 55) { state.reps = 15 }
    else if (state.intensity > 52.5) { state.reps = 17 }
    else if (state.intensity > 50) { state.reps = 18 }
    else { state.reps = 20 }
    `;

    const state = { tm: Weight.build(1000, "lb"), week: 1, intensity: 70, reps: 8, lastrep: 9 };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
          [5, 5, 150],
          [5, 6, 150],
        ],
      })
    );
    expect(state).toMatchObject({
      week: 2,
      intensity: 72.5,
      reps: 9,
      lastrep: 11,
    });
    expect(Math.round(state.tm.value)).toEqual(1005);
  });

  it("oneliner", () => {
    const program = `if (completedReps >= reps && state.lastsetrir>1) {state.reps=state.reps+1}`;
    const state = { lastsetrir: 3, reps: 5 };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [
          [5, 5, 150],
          [5, 5, 150],
        ],
      })
    );
    expect(state).toEqual({ lastsetrir: 3, reps: 6 });
  });

  it("nested conditions", () => {
    const program = `
      if ((r[1] == 3 || r[1] == 6) && (((r[2] == 3 ? 1 == 1 : 1 == 2)))) {
        state.reps = 1 == 1 ? state.reps + 1 : state.reps + 2
      }
    `;
    const state = { reps: 5 };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [
          [6, 2, 150],
          [3, 5, 150],
        ],
      })
    );
    expect(state).toEqual({ reps: 6 });
  });

  // it("fn in if", () => {
  //   const program = `
  //     if (roundWeight(state.weight * 0.323) == 100) {
  //       state.weight = roundWeight(state.weight * 0.323)
  //     }
  //   `;
  //   const state = { weight: Weight.build(1000, "lb") };
  //   ParserTestUtils.run(
  //     program,
  //     state,
  //     ParserTestUtils.bdgs({
  //       results: [[3, 5, 150]],
  //     })
  //   );
  //   expect(state).toEqual({ weight: 7 });
  // });

  it("fn in assignment", () => {
    const program = `
      state.weight = roundWeight(state.weight * 0.323123)
    `;
    const state = { weight: Weight.build(1000, "lb") };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [[3, 5, 150]],
      })
    );
    expect(state).toEqual({ weight: Weight.build(322.5, "lb") });
  });

  it("not closed parenthesis", () => {
    const program = `
    if(cr[3] >= 25 {
      state.weight = state.weight + 2.5kg}
    `;
    const state = { weight: Weight.build(100, "lb") };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [
          [3, 5, 150],
          [3, 5, 150],
          [3, 30, 150],
        ],
      })
    );
    expect(state).toEqual({ weight: Weight.build(105.5, "lb") });
  });

  it("nested conditions 2", () => {
    const program = `
    if (!(completedReps[1] >= reps[1] - 2)) {
      state.failures = state.failures + 1
    }
    `;
    const state = { failures: 0 };
    ParserTestUtils.run(
      program,
      state,
      ParserTestUtils.bdgs({
        results: [[8, 5, 150]],
      })
    );
    expect(state).toEqual({ failures: 1 });
  });

  // it("precedence", () => {
  //   const program = `
  //   if (2 + 4 * 5 / 6 > state.foo ? 8 >= r[1] * 2 : 4 != 4) {
  //     state.foo = state.foo + 1
  //   }
  //   `;
  //   const state = { foo: 3 };
  //   ParserTestUtils.run(
  //     program,
  //     state,
  //     ParserTestUtils.bdgs({
  //       results: [[4, 5, 150]],
  //     })
  //   );
  //   expect(state).toEqual({ foo: 2 });
  // });
});
