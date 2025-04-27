import { h, JSX } from "preact";
import { IPlannerProgramExercise, IPlannerExerciseState } from "../../pages/planner/models/types";
import { IPercentage, IPlannerProgram, ISettings, IWeight } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";
import { Exercise } from "../../models/exercise";
import { lb } from "lens-shmens";
import { LinkButton } from "../linkButton";
import { HistoryRecordSet } from "../historyRecordSets";
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { ObjectUtils } from "../../utils/object";
import { SwipeableRow } from "../swipeableRow";
import { Mobile } from "../../../lambda/utils/mobile";
import { InputNumber2 } from "../inputNumber2";
import { InputWeight2 } from "../inputWeight2";
import { IconPlus2 } from "../icons/iconPlus2";
import { Tailwind } from "../../utils/tailwindConfig";
import { Weight } from "../../models/weight";
import { CollectionUtils } from "../../utils/collection";

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
  return EditProgramUiHelpers.changeFirstInstance(planner, plannerExercise, settings, true, (e) => {
    e.warmupSets = PlannerProgramExercise.degroupWarmupSets(e.warmupSets || []);
    if (value.unit === "%") {
      e.warmupSets[setIndex].percentage = value.value;
      e.warmupSets[setIndex].weight = undefined;
    } else {
      e.warmupSets[setIndex].weight = value;
      e.warmupSets[setIndex].percentage = undefined;
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
  return EditProgramUiHelpers.changeFirstInstance(planner, plannerExercise, settings, true, (e) => {
    e.warmupSets = PlannerProgramExercise.degroupWarmupSets(e.warmupSets || []);
    e.warmupSets[setIndex].reps = value;
  });
}

export function EditProgramExerciseWarmups(props: IEditProgramExerciseWarmupsProps): JSX.Element {
  const { plannerExercise } = props;

  const ownWarmups = plannerExercise.warmupSets
    ? PlannerProgramExercise.degroupWarmupSets(plannerExercise.warmupSets)
    : undefined;
  const reuseWarmups = plannerExercise.reuse?.exercise?.warmupSets;
  const exercise = Exercise.findByName(plannerExercise.name, props.settings.exercises);
  const defaultWarmups = exercise ? PlannerProgramExercise.defaultWarmups(exercise, props.settings) : [];
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const displayWarmupSets = PlannerProgramExercise.warmupSetsToDisplaySets(
    ownWarmups || reuseWarmups || defaultWarmups
  );
  const isMobile = Mobile.isMobileFromWindow();
  const isPlaywright = Mobile.isPlaywrightFromWindow();
  const shouldUseTouch = isMobile && !isPlaywright;

  return (
    <div className="px-4 pt-2 pb-2 bg-white">
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
                    return EditProgramUiHelpers.changeFirstInstance(
                      program,
                      plannerExercise,
                      props.settings,
                      true,
                      (e) => {
                        e.warmupSets = ObjectUtils.clone(reuseWarmups) || defaultWarmups;
                      }
                    );
                  } else {
                    return EditProgramUiHelpers.changeAllInstances(
                      program,
                      plannerExercise.fullName,
                      props.settings,
                      true,
                      (e) => {
                        e.warmupSets = undefined;
                      }
                    );
                  }
                })
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
        <div className="flex gap-2 py-2 pl-3 pr-2 border rounded-lg bg-purplev3-50 border-purplev3-150">
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
        <div className="border rounded-lg bg-purplev3-50 border-purplev3-150">
          <div className="table w-full overflow-hidden">
            <div className="table-row-group pt-1">
              <div className="table-row text-xs border-b text-grayv2-main border-pubplev3-200">
                <div className="table-cell px-2 py-1 font-normal text-left border-b border-purplev3-150">Set</div>
                <div className="table-cell py-1 font-normal text-center border-b border-purplev3-150">Reps</div>
                <div className="table-cell py-1 text-center border-b border-purplev3-150"></div>
                <div className="table-cell py-1 pr-4 font-normal text-center border-b border-purplev3-150">Weight</div>
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
                          className="table-cell px-2 py-1 text-sm align-middle border-b border-purplev3-150"
                          data-cy="warmup-set-number"
                        >
                          <div className={`w-6 h-6 flex items-center justify-start rounded-full`}>
                            <div>{setIndex + 1}</div>
                          </div>
                        </div>
                        <div className="table-cell py-2 align-middle border-b border-purplev3-150">
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
                                    })
                                  );
                                }
                              }}
                              onBlur={(value) => {
                                if (value != null && !isNaN(value)) {
                                  props.plannerDispatch(
                                    lbProgram.recordModify((program) => {
                                      return changeReps(program, props.settings, plannerExercise, setIndex, value);
                                    })
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
                          className="table-cell px-1 py-2 text-center align-middle border-b border-purplev3-150"
                          data-cy="warmup-set-x"
                        >
                          ×
                        </div>
                        <div className="relative table-cell py-2 align-middle border-b border-purplev3-150">
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
                                    })
                                  );
                                }
                              }}
                              onInput={(value) => {
                                if (value != null) {
                                  props.plannerDispatch(
                                    lbProgram.recordModify((program) => {
                                      return changeWeight(program, props.settings, plannerExercise, setIndex, value);
                                    })
                                  );
                                }
                              }}
                              subscription={undefined}
                              value={
                                set.weight ? set.weight : set.percentage ? Weight.buildPct(set.percentage) : undefined
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
                                    return EditProgramUiHelpers.changeFirstInstance(
                                      program,
                                      plannerExercise,
                                      props.settings,
                                      true,
                                      (e) => {
                                        e.warmupSets = PlannerProgramExercise.degroupWarmupSets(e.warmupSets || []);
                                        e.warmupSets = CollectionUtils.removeAt(e.warmupSets, setIndex);
                                      }
                                    );
                                  })
                                );
                              }}
                              className="flex-1 h-full text-white bg-redv3-600 nm-workout-exercise-set-delete"
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
              className="flex-1 py-2 m-2 text-xs font-semibold text-center rounded-md bg-purplev3-100 text-bluev3-main"
              data-cy="add-warmup-set"
              onClick={() => {
                props.plannerDispatch(
                  lbProgram.recordModify((program) => {
                    return EditProgramUiHelpers.changeFirstInstance(
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
                  })
                );
              }}
            >
              <span>
                <IconPlus2 size={10} className="inline-block" color={Tailwind.colors().bluev3.main} />
              </span>
              <span className="ml-2">Add Warmup Set</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
