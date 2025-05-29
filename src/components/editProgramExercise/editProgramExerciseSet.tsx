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
  const rowRightPaddings = {
    weight: lastRow === "weight" ? "0.25rem" : "0rem",
    rpe: lastRow === "rpe" ? "0.25rem" : "0rem",
    timer: lastRow === "timer" ? "0.25rem" : "0rem",
  };
  const plannerExercise = props.plannerExercise;
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");

  function changeSet(cb: (set: IPlannerProgramExerciseEvaluatedSet) => void): void {
    if (!plannerExercise) return;
    props.plannerDispatch(
      lbProgram.recordModify((program) => {
        return EditProgramUiHelpers.changeCurrentInstance2(program, plannerExercise, props.settings, true, (ex) => {
          const setVariation = ex.evaluatedSetVariations[setVariationIndex];
          const set = setVariation.sets[setIndex];
          cb(set);
        });
      })
    );
  }

  return (
    <SwipeableRow width={128} openThreshold={30} closeThreshold={110} scrollThreshold={7} initiateTreshold={15}>
      {({ onPointerDown, onPointerMove, onPointerUp, style, close }) => (
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
          <div className="table-cell w-2 px-2 py-1 text-sm align-middle border-b border-purplev3-150">
            <div className={`text-center h-6 flex items-center justify-center rounded-full`}>
              <div>
                <div>{setIndex + 1}</div>
                {set.label && <div className="text-xs text-grayv3-main">{set.label}</div>}
              </div>
            </div>
          </div>
          {props.opts.hasMinReps && (
            <>
              {set.minrep != null ? (
                <>
                  <div className="table-cell py-2 align-middle border-b border-purplev3-150">
                    <div className="flex justify-center text-center">
                      <InputNumber2
                        width={2.5 + widthAdd}
                        data-cy="min-reps-value"
                        name="set-min-reps"
                        onBlur={(value) => changeSet((set) => (set.minrep = value))}
                        onInput={(value) => changeSet((set) => (set.minrep = value))}
                        value={set.minrep}
                        min={0}
                        max={999}
                        step={1}
                      />
                    </div>
                  </div>
                  <div className="table-cell px-1 py-2 text-center align-middle border-b border-purplev3-150">-</div>
                </>
              ) : (
                <>
                  <div className="table-cell border-b border-purplev3-150" />
                  <div className="table-cell border-b border-purplev3-150" />
                </>
              )}
            </>
          )}
          <div className="table-cell py-2 align-middle border-b border-purplev3-150">
            <div className="flex justify-center text-center">
              <InputNumber2
                width={2.5 + widthAdd}
                data-cy="reps-value"
                name="set-reps"
                onBlur={(value) => changeSet((set) => (set.maxrep = value))}
                onInput={(value) => changeSet((set) => (set.maxrep = value))}
                after={() => {
                  return set.isAmrap ? <span className="text-xs text-grayv3-main">+</span> : undefined;
                }}
                keyboardAddon={
                  <div className="py-2">
                    <InputNumberAddOn
                      label="Is AMRAP?"
                      value={set.isAmrap}
                      onChange={(value) => {
                        changeSet((set) => (set.isAmrap = value));
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
          {props.opts.hasWeight && (
            <>
              <div className="table-cell px-1 py-2 text-center align-middle border-b border-purplev3-150">×</div>
              {set.weight != null ? (
                <div className="table-cell py-2 align-middle border-b border-purplev3-150">
                  <div
                    className="flex items-center justify-center text-center"
                    style={{ paddingRight: rowRightPaddings.weight }}
                  >
                    <InputWeight2
                      name="set-weight"
                      width={3 + widthAdd}
                      exerciseType={props.plannerExercise.exerciseType}
                      data-cy="weight-value"
                      units={["lb", "kg", "%"] as const}
                      onBlur={(value) => changeSet((set) => (set.weight = value))}
                      onInput={(value) => changeSet((set) => (set.weight = value))}
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
                              changeSet((set) => (set.askWeight = value));
                            }}
                          />
                        );
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="table-cell border-b border-purplev3-150" />
              )}
            </>
          )}
          {props.opts.hasRpe &&
            (set.rpe != null ? (
              <div className="table-cell py-2 align-middle border-b border-purplev3-150">
                <div className="flex justify-center text-center" style={{ paddingRight: rowRightPaddings.rpe }}>
                  <InputNumber2
                    width={2.2 + widthAdd}
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
                            changeSet((set) => (set.logRpe = value));
                          }}
                        />
                      </div>
                    }
                    onBlur={(value) => changeSet((set) => (set.rpe = value))}
                    onInput={(value) => {
                      if (value != null && !isNaN(value)) {
                        changeSet((set) => (set.rpe = value));
                      }
                    }}
                    value={set.rpe}
                    min={0}
                    max={10}
                    step={0.5}
                  />
                </div>
              </div>
            ) : (
              <div className="table-cell border-b border-purplev3-150" />
            ))}
          {props.opts.hasTimer &&
            (set.timer != null ? (
              <div className="table-cell py-2 align-middle border-b border-purplev3-150">
                <div className="flex justify-center text-center" style={{ paddingRight: rowRightPaddings.timer }}>
                  <InputNumber2
                    width={2.5 + widthAdd}
                    data-cy="set-timer"
                    name="timer-value"
                    onBlur={(value) => changeSet((set) => (set.timer = value))}
                    onInput={(value) => changeSet((set) => (set.timer = value))}
                    value={set.timer}
                    min={0}
                    max={9999}
                    step={15}
                  />
                </div>
              </div>
            ) : (
              <div className="table-cell border-b border-purplev3-150" />
            ))}
          <div>
            <div
              className={`absolute top-0 bottom-0 flex w-32 will-change-transform left-full`}
              style={{ marginLeft: "1px" }}
            >
              <button
                tabIndex={-1}
                data-cy="edit-set-target"
                onClick={() => {
                  close();
                  props.plannerDispatch(
                    lbUi.p("editSetBottomSheet").record({
                      exerciseKey: props.plannerExercise.key,
                      setVariationIndex: props.setVariationIndex,
                      setIndex: props.setIndex,
                      dayInWeekIndex: props.plannerExercise.dayData.dayInWeek - 1,
                    })
                  );
                }}
                className="flex-1 h-full text-white bg-grayv3-main nm-workout-exercise-set-edit"
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
                    })
                  );
                  props.setSetIds((prev) => CollectionUtils.removeAt(prev, setIndex));
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
}

interface IInputNumberAddOnProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

function InputNumberAddOn(props: IInputNumberAddOnProps): JSX.Element {
  return (
    <div>
      <label className="leading-none">
        <span className="mr-2 text-sm font-semibold">{props.label}</span>
        <input
          checked={props.value}
          className="block align-middle checkbox text-bluev2"
          type="checkbox"
          onChange={(e) => {
            props.onChange(e.currentTarget.checked);
          }}
        />
      </label>
    </div>
  );
}
