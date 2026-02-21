import { h, JSX, Fragment } from "preact";
import {
  IPlannerExerciseState,
  IPlannerExerciseUi,
  IPlannerProgramExercise,
  IPlannerProgramExerciseEvaluatedSet,
} from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { SwipeableRow } from "../swipeableRow";
import { Mobile } from "../../../lambda/utils/mobile";
import { InputNumber2 } from "../inputNumber2";
import { InputWeight2 } from "../inputWeight2";
import { lb } from "lens-shmens";
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { CollectionUtils } from "../../utils/collection";
import { StateUpdater } from "preact/hooks";

interface IEditProgramExerciseSetProps {
  set: IPlannerProgramExerciseEvaluatedSet;
  plannerExercise: IPlannerProgramExercise;
  setIndex: number;
  ui: IPlannerExerciseUi;
  setVariationIndex: number;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  setIds: string[];
  setSetIds: StateUpdater<string[]>;
  settings: ISettings;
  widthAdd: number;
  opts: {
    hasMinReps: boolean;
    hasWeight: boolean;
    hasRpe: boolean;
    hasTimer: boolean;
  };
}

export function EditProgramExerciseSet(props: IEditProgramExerciseSetProps): JSX.Element {
  const { set, setIndex, setVariationIndex, widthAdd } = props;
  const isMobile = Mobile.isMobileFromWindow();
  const isPlaywright = Mobile.isPlaywrightFromWindow();
  const shouldUseTouch = isMobile && !isPlaywright;
  const lbUi = lb<IPlannerExerciseState>().pi("ui");
  const lastRowData = (
    [
      ["weight", set.weight != null],
      ["rpe", set.rpe != null],
      ["timer", set.timer != null],
    ] as const
  ).filter(([k, v]) => v);
  const lastRow = lastRowData[lastRowData.length - 1]?.[0];
  const lastRowHadData = (
    [
      ["weight", props.opts.hasWeight],
      ["rpe", props.opts.hasRpe],
      ["timer", props.opts.hasTimer],
    ] as const
  ).filter(([k, v]) => v);
  const lastHasRow = lastRowHadData[lastRowHadData.length - 1]?.[0];
  const rowRightPaddings = {
    weight: lastRow === "weight" ? "0.25rem" : "0rem",
    rpe: lastRow === "rpe" ? "0.25rem" : "0rem",
    timer: lastRow === "timer" ? "0.25rem" : "0rem",
  };
  const plannerExercise = props.plannerExercise;
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const reusingSets = plannerExercise.reuse != null && plannerExercise.setVariations.length === 0;
  const reusingWeights = reusingSets && plannerExercise.globals.weight == null;
  const reusingRpe = reusingSets && plannerExercise.globals.rpe == null;
  const reusingTimer = reusingSets && plannerExercise.globals.timer == null;

  function changeSet(cb: (s: IPlannerProgramExerciseEvaluatedSet) => void): void {
    if (!plannerExercise) {
      return;
    }
    props.plannerDispatch(
      lbProgram.recordModify((program) => {
        return EditProgramUiHelpers.changeCurrentInstance2(program, plannerExercise, props.settings, true, (ex) => {
          const setVariation = ex.evaluatedSetVariations[setVariationIndex];
          const s = setVariation.sets[setIndex];
          cb(s);
        });
      }),
      "Update set"
    );
  }

  return (
    <SwipeableRow width={128} openThreshold={30} closeThreshold={110} scrollThreshold={7} initiateTreshold={15}>
      {({ onPointerDown, onPointerMove, onPointerUp, style, close }) => {
        const buttons = (
          <div
            className={`absolute top-0 bottom-0 flex w-32 will-change-transform left-full`}
            style={{ marginLeft: "1px" }}
          >
            <button
              tabIndex={-1}
              data-cy="edit-set"
              onClick={() => {
                close();
                props.plannerDispatch(
                  lbUi.p("editSetBottomSheet").record({
                    exerciseKey: props.plannerExercise.key,
                    setVariationIndex: props.setVariationIndex,
                    setIndex: props.setIndex,
                    dayInWeekIndex: props.plannerExercise.dayData.dayInWeek - 1,
                  }),
                  "Open edit set bottom sheet"
                );
              }}
              className="flex-1 h-full text-text-alwayswhite bg-background-darkgray nm-workout-exercise-set-edit"
            >
              Edit
            </button>
            <button
              data-cy="delete-set"
              tabIndex={-1}
              onClick={() => {
                close();
                props.plannerDispatch(
                  lbProgram.recordModify((program) => {
                    return EditProgramUiHelpers.changeCurrentInstance2(
                      program,
                      plannerExercise,
                      props.settings,
                      true,
                      (ex) => {
                        const setVariation = ex.evaluatedSetVariations[setVariationIndex];
                        const sets = [...setVariation.sets];
                        setVariation.sets = CollectionUtils.removeAt(sets, setIndex);
                      }
                    );
                  }),
                  "Delete set"
                );
                props.setSetIds((prev) => CollectionUtils.removeAt(prev, setIndex));
              }}
              className="flex-1 h-full text-text-alwayswhite bg-background-darkred nm-workout-exercise-set-delete"
            >
              Delete
            </button>
          </div>
        );

        return (
          <div
            className={`will-change-transform relative table-row`}
            style={style}
            onTouchStart={shouldUseTouch ? onPointerDown : undefined}
            onTouchMove={shouldUseTouch ? onPointerMove : undefined}
            onTouchEnd={shouldUseTouch ? onPointerUp : undefined}
            onPointerDown={!shouldUseTouch ? onPointerDown : undefined}
            onPointerMove={!shouldUseTouch ? onPointerMove : undefined}
            onPointerUp={!shouldUseTouch ? onPointerUp : undefined}
          >
            <div className="table-cell w-2 px-2 py-1 text-sm align-middle border-b border-border-cardpurple">
              <div className={`text-center h-6 flex items-center justify-center rounded-full`}>
                <div>
                  <div>{setIndex + 1}</div>
                  {set.label && <div className="text-xs text-text-secondary">{set.label}</div>}
                </div>
              </div>
            </div>
            {props.opts.hasMinReps && (
              <>
                {set.minrep != null ? (
                  <>
                    <div className="table-cell py-2 align-middle border-b border-border-cardpurple">
                      <div className="flex justify-center text-center" style={{ opacity: reusingSets ? 0.5 : 1 }}>
                        <InputNumber2
                          width={2.5 + widthAdd}
                          data-cy="min-reps-value"
                          name="set-min-reps"
                          onBlur={(value) => {
                            if (value != null && !isNaN(value)) {
                              changeSet((s) => (s.minrep = value));
                            }
                          }}
                          onInput={(value) => {
                            if (value != null && !isNaN(value)) {
                              changeSet((s) => (s.minrep = value));
                            }
                          }}
                          value={set.minrep}
                          min={0}
                          max={999}
                          step={1}
                        />
                      </div>
                    </div>
                    <div className="table-cell px-1 py-2 text-center align-middle border-b border-border-cardpurple">
                      -
                    </div>
                  </>
                ) : (
                  <>
                    <div className="table-cell border-b border-border-cardpurple" />
                    <div className="table-cell border-b border-border-cardpurple" />
                  </>
                )}
              </>
            )}
            <div className="table-cell py-2 align-middle border-b border-border-cardpurple">
              <div className="flex justify-center text-center" style={{ opacity: reusingSets ? 0.3 : 1 }}>
                <InputNumber2
                  width={2.5 + widthAdd}
                  data-cy="reps-value"
                  name="set-reps"
                  onBlur={(value) => {
                    if (value != null && !isNaN(value)) {
                      changeSet((s) => (s.maxrep = value));
                    }
                  }}
                  onInput={(value) => {
                    if (value != null && !isNaN(value)) {
                      changeSet((s) => (s.maxrep = value));
                    }
                  }}
                  after={() => {
                    return set.isAmrap ? <span className="text-xs text-text-secondary">+</span> : undefined;
                  }}
                  keyboardAddon={
                    <div className="py-2">
                      <InputNumberAddOn
                        data-cy="keyboard-addon-amrap"
                        label="Is AMRAP?"
                        value={set.isAmrap}
                        onChange={(value) => {
                          changeSet((s) => (s.isAmrap = value));
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
              {lastHasRow == null && buttons}
            </div>
            {props.opts.hasWeight && (
              <>
                <div
                  data-cy="set-x"
                  className="relative table-cell px-1 py-2 text-center align-middle border-b border-border-cardpurple"
                >
                  ×
                </div>
                {set.weight != null ? (
                  <div className="relative table-cell py-2 align-middle border-b border-border-cardpurple">
                    <div
                      className="flex items-center justify-center text-center"
                      style={{
                        paddingRight: rowRightPaddings.weight,
                        opacity: reusingWeights ? 0.3 : 1,
                      }}
                    >
                      <InputWeight2
                        name="set-weight"
                        width={3 + widthAdd}
                        exerciseType={props.plannerExercise.exerciseType}
                        data-cy="weight-value"
                        units={["lb", "kg", "%"] as const}
                        onBlur={(value) => {
                          if (value != null) {
                            changeSet((s) => (s.weight = value));
                          }
                        }}
                        onInput={(value) => {
                          if (value != null) {
                            changeSet((s) => (s.weight = value));
                          }
                        }}
                        showUnitInside={true}
                        subscription={undefined}
                        value={set.weight}
                        after={() => {
                          return set.askWeight ? <span className="text-xs text-text-secondary">+</span> : undefined;
                        }}
                        max={9999}
                        min={-9999}
                        settings={props.settings}
                        addOn={() => {
                          return (
                            <InputNumberAddOn
                              data-cy="keyboard-addon-ask-weight"
                              label="Ask Weight?"
                              value={set.askWeight}
                              onChange={(value) => {
                                changeSet((s) => (s.askWeight = value));
                              }}
                            />
                          );
                        }}
                      />
                    </div>
                    {lastHasRow === "weight" && buttons}
                  </div>
                ) : (
                  <div className="relative table-cell border-b border-border-cardpurple">
                    {lastHasRow === "weight" && buttons}
                  </div>
                )}
              </>
            )}
            {props.opts.hasRpe &&
              (set.rpe != null ? (
                <div className="relative table-cell py-2 align-middle border-b border-border-cardpurple">
                  <div
                    className="flex justify-center text-center"
                    style={{ paddingRight: rowRightPaddings.rpe, opacity: reusingRpe ? 0.3 : 1 }}
                  >
                    <InputNumber2
                      width={2.2 + widthAdd}
                      data-cy="rpe-value"
                      allowDot={true}
                      name="set-rpe"
                      after={() => {
                        return set.logRpe ? <span className="text-xs text-text-secondary">+</span> : undefined;
                      }}
                      keyboardAddon={
                        <div className="py-2">
                          <InputNumberAddOn
                            label="Log RPE?"
                            data-cy="keyboard-addon-log-rpe"
                            value={set.logRpe}
                            onChange={(value) => {
                              changeSet((s) => (s.logRpe = value));
                            }}
                          />
                        </div>
                      }
                      onBlur={(value) => {
                        if (value != null && !isNaN(value)) {
                          changeSet((s) => (s.rpe = value));
                        }
                      }}
                      onInput={(value) => {
                        if (value != null && !isNaN(value)) {
                          changeSet((s) => (s.rpe = value));
                        }
                      }}
                      value={set.rpe}
                      min={0}
                      max={10}
                      step={0.5}
                    />
                  </div>
                  {lastHasRow === "rpe" && buttons}
                </div>
              ) : (
                <div className="relative table-cell border-b border-border-cardpurple">
                  {lastHasRow === "rpe" && buttons}
                </div>
              ))}
            {props.opts.hasTimer &&
              (set.timer != null ? (
                <div className="relative table-cell py-2 align-middle border-b border-border-cardpurple">
                  <div
                    className="flex justify-center text-center"
                    style={{
                      paddingRight: rowRightPaddings.timer,
                      opacity: reusingTimer ? 0.3 : 1,
                    }}
                  >
                    <InputNumber2
                      width={2.5 + widthAdd}
                      data-cy="set-timer"
                      name="timer-value"
                      onBlur={(value) => {
                        if (value != null && !isNaN(value)) {
                          changeSet((s) => (s.timer = value));
                        }
                      }}
                      onInput={(value) => {
                        if (value != null && !isNaN(value)) {
                          changeSet((s) => (s.timer = value));
                        }
                      }}
                      value={set.timer}
                      min={0}
                      max={9999}
                      step={15}
                    />
                  </div>
                  {lastHasRow === "timer" && buttons}
                </div>
              ) : (
                <div className="relative table-cell border-b border-border-cardpurple">
                  {lastHasRow === "timer" && buttons}
                </div>
              ))}
          </div>
        );
      }}
    </SwipeableRow>
  );
}

export interface IInputNumberAddOnProps {
  label: string;
  value: boolean;
  "data-cy"?: string;
  onChange: (value: boolean) => void;
}

export function InputNumberAddOn(props: IInputNumberAddOnProps): JSX.Element {
  return (
    <div>
      <label className="leading-none">
        <span className="mr-2 text-sm font-semibold">{props.label}</span>
        <input
          checked={props.value}
          data-cy={props["data-cy"]}
          className="block align-middle checkbox text-text-link"
          type="checkbox"
          onChange={(e) => {
            props.onChange(e.currentTarget.checked);
          }}
        />
      </label>
    </div>
  );
}
