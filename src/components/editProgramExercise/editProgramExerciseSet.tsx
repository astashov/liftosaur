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

interface IEditProgramExerciseSetProps {
  set: IPlannerProgramExerciseEvaluatedSet;
  plannerExercise: IPlannerProgramExercise;
  setIndex: number;
  ui: IPlannerExerciseUi;
  setVariationIndex: number;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
  opts: {
    hasMinReps: boolean;
    hasWeight: boolean;
    hasRpe: boolean;
    hasTimer: boolean;
  };
}

export function EditProgramExerciseSet(props: IEditProgramExerciseSetProps): JSX.Element {
  const { set, setIndex } = props;
  const isMobile = Mobile.isMobileFromWindow();
  const isPlaywright = Mobile.isPlaywrightFromWindow();
  const shouldUseTouch = isMobile && !isPlaywright;
  const lbUi = lb<IPlannerExerciseState>().pi("ui");

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
          <div className="table-cell px-2 py-1 text-sm align-middle border-b border-purplev3-150">
            <div className={`w-6 h-6 flex items-center justify-start rounded-full`}>
              <div>{setIndex + 1}</div>
            </div>
          </div>
          {props.opts.hasMinReps &&
            (set.minrep != null ? (
              <div className="table-cell py-2 align-middle border-b border-purplev3-150">
                <div className="flex justify-center text-center">
                  <InputNumber2
                    width={3.5}
                    data-cy="min-reps-value"
                    name="set-min-reps"
                    onInput={(value) => {}}
                    onBlur={(value) => {}}
                    value={set.minrep}
                    min={0}
                    max={9999}
                    step={1}
                  />
                </div>
              </div>
            ) : (
              <div className="table-cell border-b border-purplev3-150" />
            ))}
          <div className="table-cell py-2 align-middle border-b border-purplev3-150">
            <div className="flex justify-center text-center">
              <InputNumber2
                width={3.5}
                data-cy="reps-value"
                name="set-reps"
                onInput={(value) => {}}
                onBlur={(value) => {}}
                value={set.maxrep}
                min={0}
                max={9999}
                step={1}
              />
            </div>
          </div>
          {props.opts.hasWeight && (
            <>
              <div className="table-cell px-1 py-2 text-center align-middle border-b border-purplev3-150">×</div>
              {set.weight != null ? (
                <div className="table-cell py-2 align-middle border-b border-purplev3-150">
                  <div className="flex items-center justify-center text-center">
                    <InputWeight2
                      name="set-weight"
                      exerciseType={props.plannerExercise.exerciseType}
                      data-cy="weight-value"
                      units={["lb", "kg", "%"] as const}
                      onBlur={(value) => {}}
                      onInput={(value) => {}}
                      showUnitInside={true}
                      subscription={undefined}
                      value={set.weight}
                      max={9999}
                      min={-9999}
                      settings={props.settings}
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
                <div className="flex justify-center text-center">
                  <InputNumber2
                    width={3.5}
                    data-cy="rpe-value"
                    name="set-rpe"
                    onInput={(value) => {}}
                    onBlur={(value) => {}}
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
                <div className="flex justify-center text-center">
                  <InputNumber2
                    width={3.5}
                    data-cy="rpe-value"
                    name="set-rpe"
                    onInput={(value) => {}}
                    onBlur={(value) => {}}
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
