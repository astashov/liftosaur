import { h, JSX } from "preact";
import { BottomSheet } from "./bottomSheet";
import { IHistoryRecord, IProgressUi, ISettings } from "../types";
import { MenuItemWrapper } from "./menuItem";
import { InputNumber2 } from "./inputNumber2";
import { IDispatch } from "../ducks/types";
import { InputWeight2 } from "./inputWeight2";
import { useEffect, useState } from "preact/hooks";
import { MenuItemEditable } from "./menuItemEditable";
import { IconTrash } from "./icons/iconTrash";
import { lb } from "lens-shmens";
import { IState, updateState } from "../models/state";
import { Weight } from "../models/weight";
import { Button } from "./button";

interface IBottomSheetEditTargetProps {
  isHidden: boolean;
  progress: IHistoryRecord;
  settings: ISettings;
  editSetModal: IProgressUi["editSetModal"];
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
  const lbSet = lb<IState>().p("progress").pi(props.progress.id).pi("ui").pi("editSetModal").pi("set");
  console.log(set);

  useEffect(() => {
    console.log("Remount BottomSheetEditTargetContent");
  }, []);

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
                name="input-set-target-minreps"
                onBlur={(value) => updateState(props.dispatch, [lbSet.p("minReps").record(value)])}
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
                name="input-set-target-maxreps"
                onBlur={(value) => updateState(props.dispatch, [lbSet.p("reps").record(value ?? 1)])}
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
                  data-cy="edit-exercise-set-group-amrap"
                  className="block align-middle checkbox text-bluev2"
                  type="checkbox"
                  onChange={(e) => {
                    updateState(props.dispatch, [lbSet.p("isAmrap").record(!set.isAmrap)]);
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
                name="edit-exercise-set-weight"
                exerciseType={props.editSetModal.exerciseType}
                onBlur={(value) => {
                  console.log("value", value);
                  updateState(props.dispatch, [lbSet.p("originalWeight").record(value ?? Weight.build(0, "lb"))]);
                }}
                units={["lb", "kg", "%"] as const}
                value={set.originalWeight}
                max={9999}
                min={-9999}
                settings={props.settings}
              />
              <span className="ml-1 text-xs text-grayv3-main">{set.originalWeight.unit}</span>
            </div>
            <div>
              <label className="leading-none">
                <span className="text-xs">Ask? </span>
                <input
                  checked={set.askWeight}
                  data-cy="edit-exercise-set-group-amrap"
                  className="block align-middle checkbox text-bluev2"
                  type="checkbox"
                  onChange={(e) => {
                    updateState(props.dispatch, [lbSet.p("askWeight").record(!set.askWeight)]);
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
          value={set.rpe ? "true" : "false"}
          onChange={(value) => {
            setEnableRpe(true);
          }}
        />
      </div>
      <div style={{ display: enableRpe ? "block" : "none" }}>
        <MenuItemWrapper name="edit-set-target-reps">
          <div className="flex items-center py-1">
            <div className="mr-auto text-sm font-semibold">RPE</div>
            <div className="flex items-center gap-2">
              <div className="flex items-center mr-3">
                <InputNumber2
                  allowDot={true}
                  width={2.5}
                  name="input-set-target-maxreps"
                  onBlur={(value) => updateState(props.dispatch, [lbSet.p("rpe").record(value)])}
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
                    data-cy="edit-exercise-set-group-amrap"
                    className="block align-middle checkbox text-bluev2"
                    type="checkbox"
                    onChange={(e) => {
                      updateState(props.dispatch, [lbSet.p("logRpe").record(!set.logRpe)]);
                    }}
                  />
                </label>
              </div>
              <div>
                <button className="p-2" onClick={() => setEnableRpe(false)} style={{ marginRight: "-0.5rem" }}>
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
                  name="input-set-target-timer"
                  onBlur={(value) => updateState(props.dispatch, [lbSet.p("timer").record(value)])}
                  value={set.timer}
                  min={0}
                  max={600}
                  step={5}
                />
                <span className="ml-1 text-xs text-grayv3-main">s</span>
              </div>
              <div>
                <button className="p-2" onClick={() => setEnableTimer(false)} style={{ marginRight: "-0.5rem" }}>
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
          className="w-full"
          onClick={() => {
            const evaluatedWeight = Weight.evaluateWeight(
              set.originalWeight,
              props.editSetModal.exerciseType ?? { id: "squat" },
              props.settings
            );
            const weight = Weight.roundConvertTo(
              evaluatedWeight,
              props.settings,
              evaluatedWeight.unit,
              props.editSetModal.exerciseType
            );
            updateState(props.dispatch, [
              lb<IState>()
                .p("progress")
                .pi(props.progress.id)
                .p("entries")
                .i(props.editSetModal.entryIndex)
                .p("sets")
                .i(props.editSetModal.setIndex ?? 0)
                .record({ ...set, weight }),
            ]);
            props.onClose();
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
          settings={props.settings}
          progress={props.progress}
          dispatch={props.dispatch}
          onClose={props.onClose}
        />
      )}
    </BottomSheet>
  );
};
