import { h, JSX, Fragment } from "preact";
import {
  IPlannerExerciseState,
  IPlannerProgramExercise,
  IPlannerProgramExerciseEvaluatedSet,
} from "../../pages/planner/models/types";
import { IDaySetData, IExerciseType, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IEvaluatedProgram, Program } from "../../models/program";
import { ScrollableTabs } from "../scrollableTabs";
import { PP } from "../../models/pp";
import { InputNumber2 } from "../inputNumber2";
import { lb } from "lens-shmens";
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { CollectionUtils } from "../../utils/collection";
import { ObjectUtils } from "../../utils/object";
import { SetUtils } from "../../utils/setUtils";
import { InputWeight2 } from "../inputWeight2";
import { InputNumberAddOn } from "./editProgramExerciseSet";

interface IEditProgramExerciseAcrossAllWeeksProps {
  evaluatedProgram: IEvaluatedProgram;
  plannerExercise: IPlannerProgramExercise;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

export function EditProgramExerciseAcrossAllWeeks(props: IEditProgramExerciseAcrossAllWeeksProps): JSX.Element {
  let hasWeights = false;
  let hasRPE = false;
  let hasTimers = false;
  PP.iterate2(props.evaluatedProgram.weeks, (ex) => {
    if (ex.key !== props.plannerExercise.key) {
      return;
    }
    for (const setVariation of ex.evaluatedSetVariations) {
      for (const set of setVariation.sets) {
        hasWeights = hasWeights || set.weight != null;
        hasRPE = hasRPE || set.rpe != null;
        hasTimers = hasTimers || set.timer != null;
      }
    }
  });
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");

  function change(setData: IDaySetData[], changeFn: (set: IPlannerProgramExerciseEvaluatedSet) => void): void {
    props.plannerDispatch(
      lbProgram.recordModify((program) => {
        return EditProgramUiHelpers.changeSets(program, props.plannerExercise.key, setData, props.settings, (set) => {
          changeFn(set);
        });
      })
    );
  }

  const tabs = [
    {
      label: "Reps",
      children: () => (
        <Tab
          evaluatedProgram={props.evaluatedProgram}
          plannerExercise={props.plannerExercise}
          plannerDispatch={props.plannerDispatch}
          settings={props.settings}
          getKey={(set) => `${set.minrep}-${set.maxrep}-${set.isAmrap}`}
          getRightSide={(group, set) => (
            <RepsValue
              exerciseType={props.plannerExercise.exerciseType}
              settings={props.settings}
              group={group}
              set={set}
              change={change}
            />
          )}
        />
      ),
    },
  ];
  if (hasWeights) {
    tabs.push({
      label: "Weights",
      children: () => (
        <Tab
          evaluatedProgram={props.evaluatedProgram}
          plannerExercise={props.plannerExercise}
          plannerDispatch={props.plannerDispatch}
          settings={props.settings}
          getKey={(set) => `${set.weight?.unit}-${set.weight?.value}-${set.askWeight}`}
          getRightSide={(group, set) => (
            <WeightsValue
              exerciseType={props.plannerExercise.exerciseType}
              settings={props.settings}
              group={group}
              set={set}
              change={change}
            />
          )}
        />
      ),
    });
  }
  if (hasRPE) {
    tabs.push({
      label: "RPE",
      children: () => (
        <Tab
          evaluatedProgram={props.evaluatedProgram}
          plannerExercise={props.plannerExercise}
          plannerDispatch={props.plannerDispatch}
          settings={props.settings}
          getKey={(set) => `${set.rpe}-${set.logRpe}`}
          getRightSide={(group, set) => (
            <RpeValue
              exerciseType={props.plannerExercise.exerciseType}
              settings={props.settings}
              group={group}
              set={set}
              change={change}
            />
          )}
        />
      ),
    });
  }
  if (hasTimers) {
    tabs.push({
      label: "Timers",
      children: () => (
        <Tab
          evaluatedProgram={props.evaluatedProgram}
          plannerExercise={props.plannerExercise}
          plannerDispatch={props.plannerDispatch}
          settings={props.settings}
          getKey={(set) => `${set.timer}`}
          getRightSide={(group, set) => (
            <TimerValue
              exerciseType={props.plannerExercise.exerciseType}
              settings={props.settings}
              group={group}
              set={set}
              change={change}
            />
          )}
        />
      ),
    });
  }

  return (
    <div>
      <ScrollableTabs
        topPadding="1rem"
        shouldNotExpand={true}
        nonSticky={true}
        defaultIndex={0}
        color="purple"
        tabs={tabs}
      />
    </div>
  );
}

interface ITabProps {
  evaluatedProgram: IEvaluatedProgram;
  plannerExercise: IPlannerProgramExercise;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  getKey: (set: IPlannerProgramExerciseEvaluatedSet) => string;
  getRightSide: (group: IDaySetData[], set: IPlannerProgramExerciseEvaluatedSet) => JSX.Element;
  settings: ISettings;
}

function Tab(props: ITabProps): JSX.Element {
  const groups: Record<string, IDaySetData[]> = {};
  PP.iterate2(props.evaluatedProgram.weeks, (exercise, weekIndex, dayInWeekIndex, dayIndex) => {
    if (exercise.key !== props.plannerExercise.key) {
      return;
    }
    for (let setVariationIndex = 0; setVariationIndex < exercise.evaluatedSetVariations.length; setVariationIndex++) {
      for (let setIndex = 0; setIndex < exercise.evaluatedSetVariations[setVariationIndex].sets.length; setIndex++) {
        const set = exercise.evaluatedSetVariations[setVariationIndex].sets[setIndex];
        const key = props.getKey(set); // `${set.minrep}-${set.maxrep}`;
        groups[key] = groups[key] || [];
        groups[key].push({
          week: weekIndex + 1,
          dayInWeek: dayInWeekIndex + 1,
          setVariation: setVariationIndex + 1,
          set: setIndex + 1,
        });
      }
    }
  });

  const groupsValues = ObjectUtils.values(groups);

  const allWeeks = groupsValues.map((group) => new Set(group.map((setData) => setData.week)));
  const allDays = groupsValues.map((group) => new Set(group.map((setData) => setData.dayInWeek)));
  const setVariationsPerWeekDay: Record<string, Set<number>> = {};
  for (const group of groupsValues) {
    for (const setData of group) {
      const key = `${setData.week}-${setData.dayInWeek}`;
      setVariationsPerWeekDay[key] = setVariationsPerWeekDay[key] || new Set();
      setVariationsPerWeekDay[key].add(setData.setVariation);
    }
  }
  const setsPerWeekDaySetVariation: Record<string, Set<number>> = {};
  for (const group of groupsValues) {
    for (const setData of group) {
      const key = `${setData.week}-${setData.dayInWeek}-${setData.setVariation}`;
      setsPerWeekDaySetVariation[key] = setsPerWeekDaySetVariation[key] || new Set();
      setsPerWeekDaySetVariation[key].add(setData.set);
    }
  }
  const allWeeksEqual = SetUtils.areAllEqual(allWeeks);
  const allDaysEqual = SetUtils.areAllEqual(allDays);

  return (
    <div className="px-4">
      {Object.entries(groups).map(([key, group]) => {
        const first = group[0];
        const day = props.evaluatedProgram.weeks[first.week - 1].days[first.dayInWeek - 1];
        const exercise = Program.getProgramExerciseFromDay(day, props.plannerExercise.key);
        if (!exercise) {
          return <div key={key}>Exercise not found for key: {props.plannerExercise.key}</div>;
        }
        const set = exercise.evaluatedSetVariations[first.setVariation - 1].sets[first.set - 1];
        return (
          <div className="flex items-center gap-4 p-2 mb-4 border rounded-lg bg-purplev3-50 border-purplev3-150">
            <div className="text-sm">
              <GroupLabel
                group={group}
                allWeeksEqual={allWeeksEqual}
                allDaysEqual={allDaysEqual}
                setVariationsPerWeekDay={setVariationsPerWeekDay}
                setsPerWeekDaySetVariation={setsPerWeekDaySetVariation}
              />
            </div>
            <div className="flex items-center gap-2 ml-auto">{props.getRightSide(group, set)}</div>
          </div>
        );
      })}
    </div>
  );
}

interface IGroupLabelProps {
  group: IDaySetData[];
  allWeeksEqual: boolean;
  allDaysEqual: boolean;
  setVariationsPerWeekDay: Record<string, Set<number>>;
  setsPerWeekDaySetVariation: Record<string, Set<number>>;
}

function GroupLabel(props: IGroupLabelProps): JSX.Element {
  const groupSetVariationsPerWeekDay: Record<string, Set<number>> = {};
  for (const setData of props.group) {
    const key = `${setData.week}-${setData.dayInWeek}`;
    groupSetVariationsPerWeekDay[key] = groupSetVariationsPerWeekDay[key] || new Set();
    groupSetVariationsPerWeekDay[key].add(setData.setVariation);
  }
  const allSetVariationsEqual = ObjectUtils.entries(groupSetVariationsPerWeekDay).every(([key, setVariations]) => {
    return SetUtils.areEqual(props.setVariationsPerWeekDay[key], setVariations);
  });

  const groupSetsPerWeekDaySetVariation: Record<string, Set<number>> = {};
  for (const setData of props.group) {
    const key = `${setData.week}-${setData.dayInWeek}-${setData.setVariation}`;
    groupSetsPerWeekDaySetVariation[key] = groupSetsPerWeekDaySetVariation[key] || new Set();
    groupSetsPerWeekDaySetVariation[key].add(setData.set);
  }
  const allSetsEqual = ObjectUtils.entries(groupSetsPerWeekDaySetVariation).every(([key, sets]) => {
    return SetUtils.areEqual(props.setsPerWeekDaySetVariation[key], sets);
  });

  if (props.allWeeksEqual && props.allDaysEqual && allSetVariationsEqual && allSetsEqual) {
    return <div className="">All Sets</div>;
  }

  const parts = props.group.map<[string, number][]>((setData) => {
    const setVariationKey = `${setData.week}-${setData.dayInWeek}`;
    const areSetVariationsEqual = SetUtils.areEqual(
      groupSetVariationsPerWeekDay[setVariationKey],
      props.setVariationsPerWeekDay[setVariationKey]
    );

    const setKey = `${setData.week}-${setData.dayInWeek}-${setData.setVariation}`;
    const areSetsEqual = SetUtils.areEqual(
      groupSetsPerWeekDaySetVariation[setKey],
      props.setsPerWeekDaySetVariation[setKey]
    );
    return CollectionUtils.compact([
      props.allWeeksEqual ? undefined : ["Week", setData.week],
      props.allDaysEqual ? undefined : ["Day", setData.dayInWeek],
      areSetVariationsEqual ? undefined : ["Set Variation", setData.setVariation],
      areSetsEqual ? undefined : ["Set", setData.set],
    ]);
  });
  const collapsedParts = collapseLastElementRange(parts);
  const uniqueParts = Array.from(
    new Set(collapsedParts.map((part) => part.map(([key, value]) => `${key} ${value}`).join(", ")))
  );

  return (
    <ul>
      {uniqueParts.map((part, index) => {
        return (
          <li key={index} className="text-sm">
            {part}
          </li>
        );
      })}
    </ul>
  );
}

interface IValueProps {
  group: IDaySetData[];
  set: IPlannerProgramExerciseEvaluatedSet;
  settings: ISettings;
  exerciseType?: IExerciseType;
  change: (group: IDaySetData[], changeFn: (set: IPlannerProgramExerciseEvaluatedSet) => void) => void;
}

function RepsValue(props: IValueProps): JSX.Element {
  const { group, set, change } = props;
  return (
    <div>
      {set.minrep != null && (
        <>
          <div className="text-center">
            <div className="text-xs text-grayv3-main">Min Reps</div>
            <div>
              <InputNumber2
                width={3.5}
                data-cy="min-reps-value"
                name="set-min-reps"
                onInput={(value) => {
                  change(group, (set) => {
                    set.minrep = value;
                  });
                }}
                onBlur={(value) => {
                  change(group, (set) => {
                    set.minrep = value;
                  });
                }}
                value={set.minrep}
                min={0}
                max={999}
                step={1}
              />
            </div>
          </div>
          <div>
            <div className="text-xs text-grayv3-main">&nbsp;</div>
            <div>-</div>
          </div>
        </>
      )}
      <div className="text-center">
        <div className="text-xs text-grayv3-main">{set.minrep != null ? "Max Reps" : "Reps"}</div>
        <div>
          <InputNumber2
            width={3.5}
            data-cy="reps-value"
            name="set-reps"
            onBlur={(value) => change(group, (set) => (set.maxrep = value))}
            onInput={(value) => change(group, (set) => (set.maxrep = value))}
            after={() => {
              return set.isAmrap ? <span className="text-xs text-grayv3-main">+</span> : undefined;
            }}
            keyboardAddon={
              <div className="py-2">
                <InputNumberAddOn
                  label="Is AMRAP?"
                  value={set.isAmrap}
                  onChange={(value) => {
                    change(group, (set) => (set.isAmrap = value));
                  }}
                />
              </div>
            }
            value={set.maxrep}
            min={0}
            max={999}
            step={1}
          />
        </div>
      </div>
    </div>
  );
}

function WeightsValue(props: IValueProps): JSX.Element {
  const { group, set, change } = props;
  return (
    <div>
      {set.weight != null && (
        <>
          <div className="text-center">
            <div className="text-xs text-grayv3-main">Weight</div>
            <div>
              <InputWeight2
                name="set-weight"
                width={4}
                exerciseType={props.exerciseType}
                data-cy="weight-value"
                units={["lb", "kg", "%"] as const}
                onBlur={(value) => change(group, (set) => (set.weight = value))}
                onInput={(value) => change(group, (set) => (set.weight = value))}
                showUnitInside={true}
                subscription={undefined}
                value={set.weight}
                after={() => {
                  return set.askWeight ? <span className="text-xs text-grayv3-main">+</span> : undefined;
                }}
                max={9999}
                min={-9999}
                settings={props.settings}
                addOn={() => {
                  return (
                    <InputNumberAddOn
                      label="Ask Weight?"
                      value={set.askWeight}
                      onChange={(value) => {
                        change(group, (set) => (set.askWeight = value));
                      }}
                    />
                  );
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RpeValue(props: IValueProps): JSX.Element {
  const { group, set, change } = props;
  return (
    <div>
      {set.weight != null && (
        <>
          <div className="text-center">
            <div className="text-xs text-grayv3-main">RPE</div>
            <div>
              <InputNumber2
                width={3}
                data-cy="rpe-value"
                allowDot={true}
                name="set-rpe"
                after={() => {
                  return set.logRpe ? <span className="text-xs text-grayv3-main">+</span> : undefined;
                }}
                keyboardAddon={
                  <div className="py-2">
                    <InputNumberAddOn
                      label="Log RPE?"
                      value={set.isAmrap}
                      onChange={(value) => {
                        change(group, (set) => (set.logRpe = value));
                      }}
                    />
                  </div>
                }
                onBlur={(value) => change(group, (set) => (set.rpe = value))}
                onInput={(value) => {
                  if (value != null && !isNaN(value)) {
                    change(group, (set) => (set.rpe = value));
                  }
                }}
                value={set.rpe}
                min={0}
                max={10}
                step={0.5}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TimerValue(props: IValueProps): JSX.Element {
  const { group, set, change } = props;
  return (
    <div>
      {set.weight != null && (
        <>
          <div className="text-center">
            <div className="text-xs text-grayv3-main">Timer</div>
            <div>
              <InputNumber2
                width={3.5}
                data-cy="set-timer"
                name="timer-value"
                onBlur={(value) => change(group, (set) => (set.timer = value))}
                onInput={(value) => change(group, (set) => (set.timer = value))}
                value={set.timer}
                min={0}
                max={9999}
                step={15}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function collapseLastElementRange(data: [string, number][][]): [string, string][][] {
  if (data.length === 0) return [];

  const result: [string, string][][] = [];

  let currentGroup: [string, number][][] = [data[0]];

  for (let i = 1; i < data.length; i++) {
    const prev = currentGroup[currentGroup.length - 1];
    const curr = data[i];

    const prevLast = prev[prev.length - 1];
    const currLast = curr[curr.length - 1];

    const sameDepth = prev.length === curr.length;
    const sameLastKey = prevLast[0] === currLast[0];
    const samePrefix = isSamePrefix(prev, curr);
    const isConsecutive = currLast[1] === prevLast[1] + 1;

    const canGroup = sameDepth && sameLastKey && isConsecutive && (curr.length === 1 || samePrefix);

    if (canGroup) {
      currentGroup.push(curr);
    } else {
      result.push(buildCollapsedGroup(currentGroup));
      currentGroup = [curr];
    }
  }

  result.push(buildCollapsedGroup(currentGroup));

  return result;
}

function isSamePrefix(a: [string, number][], b: [string, number][]): boolean {
  for (let i = 0; i < a.length - 1; i++) {
    if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
  }
  return true;
}

function buildCollapsedGroup(group: [string, number][][]): [string, string][] {
  const firstEntry = group[0];
  const lastEntry = group[group.length - 1];

  if (firstEntry.length === 1) {
    // e.g., [["Week", 3]], [["Week", 4]]
    const key = firstEntry[0][0];
    const start = firstEntry[0][1];
    const end = lastEntry[0][1];
    const range = start === end ? `${start}` : `${start}-${end}`;
    return [[key, range]];
  }

  const prefix = firstEntry.slice(0, -1).map(([k, v]) => [k, v.toString()]) as [string, string][];
  const lastKey = firstEntry[firstEntry.length - 1][0];
  const firstVal = firstEntry[firstEntry.length - 1][1];
  const lastVal = lastEntry[lastEntry.length - 1][1];
  const range = firstVal === lastVal ? `${firstVal}` : `${firstVal}-${lastVal}`;
  return [...prefix, [lastKey, range]];
}
