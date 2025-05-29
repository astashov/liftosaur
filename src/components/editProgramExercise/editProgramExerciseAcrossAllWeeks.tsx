import { h, JSX, Fragment } from "preact";
import {
  IPlannerExerciseState,
  IPlannerProgramExercise,
  IPlannerProgramExerciseEvaluatedSet,
} from "../../pages/planner/models/types";
import { IDaySetData, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IEvaluatedProgram, Program } from "../../models/program";
import { ScrollableTabs } from "../scrollableTabs";
import { PP } from "../../models/pp";
import { InputNumber2 } from "../inputNumber2";
import { lb } from "lens-shmens";
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { CollectionUtils } from "../../utils/collection";
import { ObjectUtils } from "../../utils/object";

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
  const tabs = [
    {
      label: "Reps",
      children: () => (
        <Tab
          evaluatedProgram={props.evaluatedProgram}
          plannerExercise={props.plannerExercise}
          plannerDispatch={props.plannerDispatch}
          settings={props.settings}
          type="reps"
        />
      ),
    },
  ];
  if (hasWeights) {
    tabs.push({
      label: "Weights",
      children: () => <div />,
    });
  }
  if (hasRPE) {
    tabs.push({
      label: "RPE",
      children: () => <div />,
    });
  }
  if (hasTimers) {
    tabs.push({
      label: "Timers",
      children: () => <div />,
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
  settings: ISettings;
  type: "reps" | "weights" | "rpe" | "timers";
}

function Tab(props: ITabProps): JSX.Element {
  const groups: Record<string, IDaySetData[]> = {};
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  PP.iterate2(props.evaluatedProgram.weeks, (exercise, weekIndex, dayInWeekIndex, dayIndex) => {
    if (exercise.key !== props.plannerExercise.key) {
      return;
    }
    for (let setVariationIndex = 0; setVariationIndex < exercise.evaluatedSetVariations.length; setVariationIndex++) {
      for (let setIndex = 0; setIndex < exercise.evaluatedSetVariations[setVariationIndex].sets.length; setIndex++) {
        const set = exercise.evaluatedSetVariations[setVariationIndex].sets[setIndex];
        const key = `${set.minrep}-${set.maxrep}`;
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

  function change(setData: IDaySetData[], changeFn: (set: IPlannerProgramExerciseEvaluatedSet) => void): void {
    props.plannerDispatch(
      lbProgram.recordModify((program) => {
        return EditProgramUiHelpers.changeSets(program, props.plannerExercise.key, setData, props.settings, (set) => {
          changeFn(set);
        });
      })
    );
  }

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
            <div className="text-sm font-semibold">
              <GroupLabel groups={ObjectUtils.values(groups)} group={group} />
            </div>
            <div className="flex items-center gap-2 ml-auto">
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
                    width={2.5}
                    data-cy="max-reps-value"
                    name="set-max-reps"
                    onInput={(value) => {
                      change(group, (set) => {
                        set.maxrep = value;
                      });
                    }}
                    onBlur={(value) => {
                      change(group, (set) => {
                        set.maxrep = value;
                      });
                    }}
                    value={set.maxrep}
                    min={0}
                    max={999}
                    step={1}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface IGroupLabelProps {
  groups: IDaySetData[][];
  group: IDaySetData[];
}

function GroupLabel(props: IGroupLabelProps): JSX.Element {
  if (props.group.length === 1) {
    return <div className="">All Reps</div>;
  }

  // Week - if all weeks for each group are the same, do not show the week
  // Day - if all days for each group are the same, do not show the day
  // Set Variation - if all set variations for each group are the same, do not show the set variation

  // const allWeeks = props.groups.map((group) => new Set(group.map((setData) => setData.week)));
  // const allDays = props.groups.map((group) => new Set(group.map((setData) => setData.dayInWeek)));

  // const allSetGroups = props.groups.filter((group) => {
  //   return group.some((g) => g.week === props.group[0].week && g.dayInWeek === props.group[0].dayInWeek);
  // });

  // const allSetVariations = props.groups.map((group) => new Set(group.map((setData) => setData.setVariation)));
  // const allSets = props.groups.map((group) => new Set(group.map((setData) => setData.set)));
  // const allWeeksEqual = SetUtils.areAllEqual(allWeeks);
  // const allDaysEqual = SetUtils.areAllEqual(allDays);
  // const allSetVariationsEqual = SetUtils.areAllEqual(allSetVariations);
  // const allSetsEqual = SetUtils.areAllEqual(allSets); //  && group.;

  const allWeeksEqual = false;
  const allDaysEqual = false;
  const allSetVariationsEqual = false;
  const allSetsEqual = false;

  return (
    <ul>
      {props.group.map((setData) => {
        const parts = CollectionUtils.compact([
          allWeeksEqual ? undefined : `Week ${setData.week}`,
          allDaysEqual ? undefined : `Day ${setData.dayInWeek}`,
          allSetVariationsEqual ? undefined : `Set Variation ${setData.setVariation}`,
          allSetsEqual ? undefined : `Set ${setData.set}`,
        ]);
        return (
          <li className="text-sm">
            {parts.map((part, i) => (
              <>
                {i > 0 && <span>, </span>}
                <span>{part}</span>
              </>
            ))}
          </li>
        );
      })}
    </ul>
  );
}
