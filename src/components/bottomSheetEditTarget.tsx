import { h, JSX } from "preact";
import { BottomSheet } from "./bottomSheet";
import { IHistoryRecord, IProgressUi, ISettings, ISubscription } from "../types";
import { MenuItemWrapper } from "./menuItem";
import { InputNumber2 } from "./inputNumber2";
import { IDispatch } from "../ducks/types";
import { InputWeight2 } from "./inputWeight2";
import { useState } from "preact/hooks";
import { MenuItemEditable } from "./menuItemEditable";
import { IconTrash } from "./icons/iconTrash";
import { lb } from "lens-shmens";
import { updateProgress } from "../models/state";
import { Weight } from "../models/weight";
import { Button } from "./button";

interface IBottomSheetEditTargetProps {
  isHidden: boolean;
  progress: IHistoryRecord;
  settings: ISettings;
  editSetModal: IProgressUi["editSetModal"];
  subscription?: ISubscription;
  dispatch: IDispatch;
  onClose: () => void;
}

type IBottomSheetEditTargetContentProps = Omit<IBottomSheetEditTargetProps, "isHidden"> & {
  editSetModal: Required<IProgressUi>["editSetModal"];
};

function BottomSheetEditTargetContent(props: IBottomSheetEditTargetContentProps): JSX.Element {
  const set = props.editSetModal.set;
  const [enableRpe, setEnableRpe] = useState(set.rpe != null);
  const [enableTimer, setEnableTimer] = useState(set.timer != null);
  const lbSet = lb<IHistoryRecord>().pi("ui").pi("editSetModal").pi("set");

  return (
    <div className="px-4 pb-4">
      <h3 className="py-2 text-base font-semibold text-center">Edit Set Target</h3>
      <MenuItemWrapper name="edit-set-target-reps">
        <div className="flex items-center py-2">
          <div className="mr-auto text-sm font-semibold">Reps</div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-grayv3-main">Min</div>
            <div className="mr-2">
              <InputNumber2
                width={2.5}
                name="target-minreps"
                onBlur={(value) =>
                  updateProgress(props.dispatch, [lbSet.p("minReps").record(value)], "target-blur-minreps")
                }
                onInput={(value) => {
                  if (value != null && !isNaN(value) && value >= 0) {
                    updateProgress(props.dispatch, [lbSet.p("minReps").record(value)], "target-input-minreps");
                  }
                }}
                value={set.minReps}
                min={0}
                max={9999}
                step={1}
              />
            </div>
            <div className="text-xs text-grayv3-main">Max</div>
            <div className="mr-3">
              <InputNumber2
                width={2.5}
                name="target-maxreps"
                onBlur={(value) =>
                  updateProgress(props.dispatch, [lbSet.p("reps").record(value)], "target-blur-maxreps")
                }
                onInput={(value) => {
                  if (value == null || (!isNaN(value) && value >= 0)) {
                    updateProgress(props.dispatch, [lbSet.p("reps").record(value)], "target-input-maxreps");
                  }
                }}
                value={set.reps}
                min={0}
                max={9999}
                step={1}
              />
            </div>
            <div>
              <label className="leading-none">
                <span className="text-xs">AMRAP? </span>
                <input
                  checked={set.isAmrap}
                  data-cy="edit-target-amrap"
                  className="block align-middle checkbox text-bluev2"
                  type="checkbox"
                  onChange={(e) => {
                    updateProgress(props.dispatch, [lbSet.p("isAmrap").record(!set.isAmrap)], "amrap-checkbox");
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </MenuItemWrapper>
      <MenuItemWrapper name="edit-set-target-reps">
        <div className="flex items-center py-2">
          <div className="mr-auto text-sm font-semibold">Weight</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center mr-3">
              <InputWeight2
                name="target-weight"
                subscription={props.subscription}
                exerciseType={props.editSetModal.exerciseType}
                onBlur={(value) => {
                  updateProgress(
                    props.dispatch,
                    [lbSet.p("originalWeight").record(value ?? Weight.build(0, "lb"))],
                    "target-blur-weight"
                  );
                }}
                onInput={(value) => {
                  if (value != null) {
                    updateProgress(
                      props.dispatch,
                      [lbSet.p("originalWeight").record(value ?? Weight.build(0, "lb"))],
                      "target-input-weight"
                    );
                  }
                }}
                units={["lb", "kg", "%"] as const}
                value={set.originalWeight}
                max={9999}
                min={-9999}
                settings={props.settings}
              />
              <span className="ml-1 text-xs text-grayv3-main">{set.originalWeight?.unit ?? props.settings.units}</span>
            </div>
            <div>
              <label className="leading-none">
                <span className="text-xs">Ask? </span>
                <input
                  checked={set.askWeight}
                  data-cy="edit-target-ask-weight"
                  className="block align-middle checkbox text-bluev2"
                  type="checkbox"
                  onChange={(e) => {
                    updateProgress(
                      props.dispatch,
                      [lbSet.p("askWeight").record(!set.askWeight)],
                      "ask-weight-checkbox"
                    );
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </MenuItemWrapper>
      <div className="font-semibold" style={{ display: !enableRpe ? "block" : "none" }}>
        <MenuItemEditable
          size="sm"
          type="boolean"
          name="Enable RPE?"
          value={set.rpe != null ? "true" : "false"}
          onChange={(value) => {
            setEnableRpe(true);
          }}
        />
      </div>
      <div style={{ display: enableRpe ? "block" : "none" }}>
        <MenuItemWrapper name="edit-set-target-rpe">
          <div className="flex items-center py-1">
            <div className="mr-auto text-sm font-semibold">RPE</div>
            <div className="flex items-center gap-2">
              <div className="flex items-center mr-3">
                <InputNumber2
                  allowDot={true}
                  width={2.5}
                  name="target-rpe"
                  onBlur={(value) => updateProgress(props.dispatch, [lbSet.p("rpe").record(value)], "target-blur-rpe")}
                  onInput={(value) => {
                    if (value != null && !isNaN(value) && value >= 0) {
                      updateProgress(props.dispatch, [lbSet.p("rpe").record(value)], "target-input-rpe");
                    }
                  }}
                  value={set.rpe}
                  min={0}
                  max={10}
                  step={0.5}
                />
              </div>
              <div>
                <label className="leading-none">
                  <span className="text-xs">Log? </span>
                  <input
                    checked={set.logRpe}
                    data-cy="edit-target-log-rpe"
                    className="block align-middle checkbox text-bluev2"
                    type="checkbox"
                    onChange={(e) => {
                      updateProgress(props.dispatch, [lbSet.p("logRpe").record(!set.logRpe)], "log-rpe-checkbox");
                    }}
                  />
                </label>
              </div>
              <div>
                <button
                  className="p-2"
                  onClick={() => {
                    setEnableRpe(false);
                    updateProgress(
                      props.dispatch,
                      [lbSet.p("logRpe").record(false), lbSet.p("rpe").record(undefined)],
                      "clear-rpe"
                    );
                  }}
                  style={{ marginRight: "-0.5rem" }}
                >
                  <IconTrash width={15} height={20} />
                </button>
              </div>
            </div>
          </div>
        </MenuItemWrapper>
      </div>
      <div className="font-semibold" style={{ display: !enableTimer ? "block" : "none" }}>
        <MenuItemEditable
          size="sm"
          type="boolean"
          name="Enable Custom Timer?"
          value={set.timer ? "true" : "false"}
          onChange={(value) => {
            setEnableTimer(true);
          }}
        />
      </div>
      <div style={{ display: enableTimer ? "block" : "none" }}>
        <MenuItemWrapper name="edit-set-target-timer">
          <div className="flex items-center py-1">
            <div className="mr-auto text-sm font-semibold">Timer</div>
            <div className="flex items-center gap-2">
              <div className="flex items-center mr-3">
                <InputNumber2
                  width={2.5}
                  name="target-timer"
                  onBlur={(value) =>
                    updateProgress(props.dispatch, [lbSet.p("timer").record(value)], "target-blur-timer")
                  }
                  onInput={(value) => {
                    if (value != null && !isNaN(value) && value >= 0) {
                      updateProgress(props.dispatch, [lbSet.p("timer").record(value)], "target-input-timer");
                    }
                  }}
                  value={set.timer}
                  min={0}
                  max={600}
                  step={5}
                />
                <span className="ml-1 text-xs text-grayv3-main">s</span>
              </div>
              <div>
                <button
                  className="p-2"
                  onClick={() => {
                    setEnableTimer(false);
                    updateProgress(props.dispatch, [lbSet.p("timer").record(undefined)], "target-clear-timer");
                  }}
                  style={{ marginRight: "-0.5rem" }}
                >
                  <IconTrash width={15} height={20} />
                </button>
              </div>
            </div>
          </div>
        </MenuItemWrapper>
      </div>
      <div className="my-4">
        <Button
          kind="purple"
          name="edit-set-target-save"
          data-cy="edit-set-target-save"
          className="w-full"
          onClick={() => {
            const evaluatedWeight = set.originalWeight
              ? Weight.evaluateWeight(
                  set.originalWeight,
                  props.editSetModal.exerciseType ?? { id: "squat" },
                  props.settings
                )
              : undefined;
            const weight = evaluatedWeight
              ? Weight.roundConvertTo(
                  evaluatedWeight,
                  props.settings,
                  evaluatedWeight.unit,
                  props.editSetModal.exerciseType
                )
              : undefined;
            const reps = set.minReps != null && set.reps == null ? set.minReps : set.reps;
            const minReps = set.minReps != null && set.reps == null ? undefined : set.minReps;
            const newSet = { ...set, weight, reps, minReps };
            updateProgress(
              props.dispatch,
              [
                lb<IHistoryRecord>()
                  .p("entries")
                  .i(props.editSetModal.entryIndex)
                  .p("sets")
                  .i(props.editSetModal.setIndex ?? 0)
                  .record(newSet),
                lb<IHistoryRecord>().pi("ui").p("editSetModal").record(undefined),
              ],
              "save-target"
            );
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

export const BottomSheetEditTarget = (props: IBottomSheetEditTargetProps): JSX.Element => {
  const editSetModal = props.editSetModal;
  return (
    <BottomSheet shouldShowClose={true} onClose={props.onClose} isHidden={props.isHidden}>
      {editSetModal && (
        <BottomSheetEditTargetContent
          editSetModal={editSetModal}
          subscription={props.subscription}
          settings={props.settings}
          progress={props.progress}
          dispatch={props.dispatch}
          onClose={props.onClose}
        />
      )}
    </BottomSheet>
  );
};
