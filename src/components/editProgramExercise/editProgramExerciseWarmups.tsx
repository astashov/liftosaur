import { h, JSX } from "preact";
import { IPlannerProgramExercise, IPlannerExerciseState } from "../../pages/planner/models/types";
import { IPercentage, IPlannerProgram, ISettings, IWeight } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import {
  PlannerProgramExercise_degroupWarmupSets,
  PlannerProgramExercise_defaultWarmups,
  PlannerProgramExercise_warmupSetsToDisplaySets,
} from "../../pages/planner/models/plannerProgramExercise";
import { Exercise_findByName } from "../../models/exercise";
import { lb } from "lens-shmens";
import { LinkButton } from "../linkButton";
import { HistoryRecordSet } from "../historyRecordSets";
import {
  EditProgramUiHelpers_changeFirstInstance,
  EditProgramUiHelpers_changeAllInstances,
} from "../editProgram/editProgramUi/editProgramUiHelpers";
import { ObjectUtils_clone } from "../../utils/object";
import { SwipeableRow } from "../swipeableRow";
import { Mobile_isMobileFromWindow, Mobile_isPlaywrightFromWindow } from "../../../lambda/utils/mobile";
import { InputNumber2 } from "../inputNumber2";
import { InputWeight2 } from "../inputWeight2";
import { IconPlus2 } from "../icons/iconPlus2";
import { Tailwind_colors } from "../../utils/tailwindConfig";
import { Weight_buildPct } from "../../models/weight";
import { CollectionUtils_removeAt } from "../../utils/collection";

interface IEditProgramExerciseWarmupsProps {
  plannerExercise: IPlannerProgramExercise;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

function changeWeight(
  planner: IPlannerProgram,
  settings: ISettings,
  plannerExercise: IPlannerProgramExercise,
  setIndex: number,
  value: IWeight | IPercentage
): IPlannerProgram {
  return EditProgramUiHelpers_changeFirstInstance(planner, plannerExercise, settings, true, (e) => {
    e.warmupSets = PlannerProgramExercise_degroupWarmupSets(e.warmupSets || []);
    if (e.warmupSets[setIndex] != null) {
      if (value.unit === "%") {
        e.warmupSets[setIndex].percentage = value.value;
        e.warmupSets[setIndex].weight = undefined;
      } else {
        e.warmupSets[setIndex].weight = value;
        e.warmupSets[setIndex].percentage = undefined;
      }
    }
  });
}

function changeReps(
  planner: IPlannerProgram,
  settings: ISettings,
  plannerExercise: IPlannerProgramExercise,
  setIndex: number,
  value: number
): IPlannerProgram {
  return EditProgramUiHelpers_changeFirstInstance(planner, plannerExercise, settings, true, (e) => {
    e.warmupSets = PlannerProgramExercise_degroupWarmupSets(e.warmupSets || []);
    if (e.warmupSets[setIndex] != null) {
      e.warmupSets[setIndex].reps = value;
    }
  });
}

export function EditProgramExerciseWarmups(props: IEditProgramExerciseWarmupsProps): JSX.Element {
  const { plannerExercise } = props;

  const ownWarmups = plannerExercise.warmupSets
    ? PlannerProgramExercise_degroupWarmupSets(plannerExercise.warmupSets)
    : undefined;
  const reuseWarmups = plannerExercise.reuse?.exercise?.warmupSets;
  const exercise = Exercise_findByName(plannerExercise.name, props.settings.exercises);
  const defaultWarmups = exercise ? PlannerProgramExercise_defaultWarmups(exercise, props.settings) : [];
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const displayWarmupSets = PlannerProgramExercise_warmupSetsToDisplaySets(
    ownWarmups || reuseWarmups || defaultWarmups
  );
  const isMobile = Mobile_isMobileFromWindow();
  const isPlaywright = Mobile_isPlaywrightFromWindow();
  const shouldUseTouch = isMobile && !isPlaywright;

  return (
    <div className="px-4 pt-2 pb-2 bg-background-default">
      <div className="flex gap-4 pb-2">
        <div className="text-base font-bold">Edit Warmups</div>
        <div className="ml-auto">
          <LinkButton
            className="text-sm"
            data-cy="edit-exercise-warmups-customize"
            name="customize-warmups"
            onClick={() => {
              props.plannerDispatch(
                lbProgram.recordModify((program) => {
                  if (ownWarmups == null) {
                    return EditProgramUiHelpers_changeFirstInstance(
                      program,
                      plannerExercise,
                      props.settings,
                      true,
                      (e) => {
                        e.warmupSets = ObjectUtils_clone(reuseWarmups) || defaultWarmups;
                      }
                    );
                  } else {
                    return EditProgramUiHelpers_changeAllInstances(
                      program,
                      plannerExercise.fullName,
                      props.settings,
                      true,
                      (e) => {
                        e.warmupSets = undefined;
                      }
                    );
                  }
                }),
                "Customize warmups"
              );
            }}
          >
            {reuseWarmups
              ? ownWarmups != null
                ? "Switch to reused"
                : "Override"
              : ownWarmups != null
                ? "Switch to default"
                : "Customize"}
          </LinkButton>
        </div>
      </div>
      {ownWarmups == null ? (
        <div className="flex gap-2 py-2 pl-3 pr-2 border rounded-lg bg-background-subtlecardpurple border-border-cardpurple">
          <div className="flex-1 text-sm">
            {reuseWarmups ? <div>Reused from</div> : <div className="font-semibold">Default warmups</div>}
          </div>
          <div className="">
            {displayWarmupSets.map((g) => (
              <HistoryRecordSet sets={g} isNext={true} settings={props.settings} />
            ))}
          </div>
        </div>
      ) : (
        <div className="border rounded-lg bg-background-subtlecardpurple border-border-cardpurple">
          <div className="table w-full overflow-hidden">
            <div className="table-row-group pt-1">
              <div className="table-row text-xs border-b text-text-secondary border-border-neutral">
                <div className="table-cell px-2 py-1 font-normal text-left border-b border-border-neutral">Set</div>
                <div className="table-cell py-1 font-normal text-center border-b border-border-neutral">Reps</div>
                <div className="table-cell py-1 text-center border-b border-border-neutral"></div>
                <div className="table-cell py-1 pr-4 font-normal text-center border-b border-border-neutral">
                  Weight
                </div>
              </div>
            </div>
            <div className="table-row-group">
              {ownWarmups.map((set, setIndex) => {
                return (
                  <SwipeableRow
                    width={64}
                    openThreshold={15}
                    closeThreshold={55}
                    scrollThreshold={7}
                    initiateTreshold={15}
                  >
                    {({ onPointerDown, onPointerMove, onPointerUp, style, close }) => (
                      <div
                        className={`will-change-transform relative table-row`}
                        data-cy="warmup-set"
                        style={style}
                        onTouchStart={shouldUseTouch ? onPointerDown : undefined}
                        onTouchMove={shouldUseTouch ? onPointerMove : undefined}
                        onTouchEnd={shouldUseTouch ? onPointerUp : undefined}
                        onPointerDown={!shouldUseTouch ? onPointerDown : undefined}
                        onPointerMove={!shouldUseTouch ? onPointerMove : undefined}
                        onPointerUp={!shouldUseTouch ? onPointerUp : undefined}
                      >
                        <div
                          className="table-cell px-2 py-1 text-sm align-middle border-b border-border-neutral"
                          data-cy="warmup-set-number"
                        >
                          <div className={`w-6 h-6 flex items-center justify-start rounded-full`}>
                            <div>{setIndex + 1}</div>
                          </div>
                        </div>
                        <div className="table-cell py-2 align-middle border-b border-border-neutral">
                          <div className="flex justify-center text-center">
                            <InputNumber2
                              width={3.5}
                              data-cy="reps-value"
                              name="set-reps"
                              onInput={(value) => {
                                if (value != null && !isNaN(value)) {
                                  props.plannerDispatch(
                                    lbProgram.recordModify((program) => {
                                      return changeReps(program, props.settings, plannerExercise, setIndex, value);
                                    }),
                                    "Change warmup reps"
                                  );
                                }
                              }}
                              onBlur={(value) => {
                                if (value != null && !isNaN(value)) {
                                  props.plannerDispatch(
                                    lbProgram.recordModify((program) => {
                                      return changeReps(program, props.settings, plannerExercise, setIndex, value);
                                    }),
                                    "Change warmup reps"
                                  );
                                }
                              }}
                              value={set.reps}
                              min={0}
                              max={9999}
                              step={1}
                            />
                          </div>
                        </div>
                        <div
                          className="table-cell px-1 py-2 text-center align-middle border-b border-border-neutral"
                          data-cy="warmup-set-x"
                        >
                          ×
                        </div>
                        <div className="relative table-cell py-2 align-middle border-b border-border-neutral">
                          <div className="flex items-center justify-center text-center">
                            <InputWeight2
                              name="set-weight"
                              exerciseType={plannerExercise.exerciseType}
                              data-cy="weight-value"
                              units={["lb", "kg", "%"] as const}
                              onBlur={(value) => {
                                if (value != null) {
                                  props.plannerDispatch(
                                    lbProgram.recordModify((program) => {
                                      return changeWeight(program, props.settings, plannerExercise, setIndex, value);
                                    }),
                                    "Change warmup weight"
                                  );
                                }
                              }}
                              onInput={(value) => {
                                if (value != null) {
                                  props.plannerDispatch(
                                    lbProgram.recordModify((program) => {
                                      return changeWeight(program, props.settings, plannerExercise, setIndex, value);
                                    }),
                                    "Change warmup weight"
                                  );
                                }
                              }}
                              subscription={undefined}
                              value={
                                set.weight ? set.weight : set.percentage ? Weight_buildPct(set.percentage) : undefined
                              }
                              max={9999}
                              min={-9999}
                              settings={props.settings}
                            />
                            <div className="ml-1 text-xs">
                              {set.weight ? set.weight.unit : set.percentage != null ? "%" : ""}
                            </div>
                          </div>
                          <div
                            className={`absolute top-0 bottom-0 flex w-16 will-change-transform left-full`}
                            style={{ marginLeft: "1px" }}
                          >
                            <button
                              data-cy="delete-warmup-set"
                              tabIndex={-1}
                              onClick={() => {
                                close();
                                props.plannerDispatch(
                                  lbProgram.recordModify((program) => {
                                    return EditProgramUiHelpers_changeFirstInstance(
                                      program,
                                      plannerExercise,
                                      props.settings,
                                      true,
                                      (e) => {
                                        e.warmupSets = PlannerProgramExercise_degroupWarmupSets(e.warmupSets || []);
                                        e.warmupSets = CollectionUtils_removeAt(e.warmupSets, setIndex);
                                      }
                                    );
                                  }),
                                  "Delete warmup set"
                                );
                              }}
                              className="flex-1 h-full text-text-alwayswhite bg-background-darkred nm-workout-exercise-set-delete"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </SwipeableRow>
                );
              })}
            </div>
          </div>
          <div className="flex">
            <button
              className="flex-1 py-2 m-2 text-xs font-semibold text-center rounded-md bg-background-purpledark text-text-link"
              data-cy="add-warmup-set"
              onClick={() => {
                props.plannerDispatch(
                  lbProgram.recordModify((program) => {
                    return EditProgramUiHelpers_changeFirstInstance(
                      program,
                      plannerExercise,
                      props.settings,
                      true,
                      (e) => {
                        const lastReps = e.warmupSets?.[e.warmupSets.length - 1]?.reps ?? 5;
                        const lastWeight = e.warmupSets?.[e.warmupSets.length - 1]?.weight;
                        let lastPercentage = e.warmupSets?.[e.warmupSets.length - 1]?.percentage;
                        if (lastWeight == null && lastPercentage == null) {
                          lastPercentage = 50;
                        }
                        e.warmupSets = [
                          ...(e.warmupSets || []),
                          {
                            type: "warmup",
                            numberOfSets: 1,
                            reps: lastReps,
                            weight: lastWeight,
                            percentage: lastPercentage,
                          },
                        ];
                      }
                    );
                  }),
                  "Add warmup set"
                );
              }}
            >
              <span>
                <IconPlus2 size={10} className="inline-block" color={Tailwind_colors().blue[400]} />
              </span>
              <span className="ml-2">Add Warmup Set</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
