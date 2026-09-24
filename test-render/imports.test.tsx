const modules = [
  "../src/utils/indexeddb",
  "../src/utils/persistence",
  "../src/utils/ota",
  "../src/utils/health",
  "../src/utils/appEnv",
  "../src/ducks/reducer",
  "../src/components/workoutExerciseSet",
  "../src/components/workout",
  "../src/components/screenWorkout",
  "../src/navigation/AppNavigator",
  "../src/App.native",
];

// The app under test runs these two mocked, because their setInterval keeps jest alive. Importing
// the real module still proves no native import throws, which is what this file is for.
const mockedInTheApp = ["../src/utils/analytics", "../src/utils/eventManager"];

describe("the app graph imports under jest", () => {
  for (const path of modules) {
    it(`imports ${path} without touching a native binary`, () => {
      expect(() => require(path)).not.toThrow();
    });
  }

  for (const path of mockedInTheApp) {
    it(`imports the real ${path} without touching a native binary`, () => {
      jest.useFakeTimers();
      try {
        expect(() => jest.requireActual(path)).not.toThrow();
      } finally {
        jest.clearAllTimers();
        jest.useRealTimers();
      }
    });
  }
});
