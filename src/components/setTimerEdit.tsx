import { JSX, useState } from "react";
import { View } from "react-native";
import { lb } from "lens-shmens";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { Input } from "./input";
import { updateProgress } from "../models/state";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord, ISet } from "../types";
import { MathUtils_clamp } from "../utils/math";
import { StringUtils_pad } from "../utils/string";

interface ISetTimerEditContentProps {
  set: ISet;
  entryIndex: number;
  setIndex: number;
  dispatch: IDispatch;
}

export function SetTimerEditContent(props: ISetTimerEditContentProps): JSX.Element {
  const { set, entryIndex, setIndex, dispatch } = props;
  const initialSeconds = set.completedSetTimer ?? set.setTimer ?? 0;

  const [minutesValue, setMinutesValue] = useState(Math.floor(initialSeconds / 60).toString());
  const [secondsValue, setSecondsValue] = useState(StringUtils_pad((initialSeconds % 60).toString(), 2));

  const lbSet = lb<IHistoryRecord>().p("entries").i(entryIndex).p("sets").i(setIndex);
  const lbModal = lb<IHistoryRecord>().pi("ui", {}).p("setTimerEditModal");

  // Write the value and clear the modal flag in a SINGLE dispatch. The web playground's dispatch applies each
  // action to a progress snapshot captured at render, so a second dispatch (e.g. a separate onClose) would read
  // the stale snapshot and clobber this write. Clearing the flag here is what closes the modal (unmount on web,
  // shouldGoBack pop on native) — no separate onClose() call needed.
  const onClear = (): void => {
    updateProgress(
      dispatch,
      [lbSet.p("completedSetTimer").record(undefined), lbModal.record(undefined)],
      "clear-set-timer"
    );
  };

  const onSave = (): void => {
    const minutes = Number(minutesValue);
    const seconds = Number(secondsValue);
    const newSeconds =
      isNaN(minutes) || isNaN(seconds)
        ? initialSeconds
        : MathUtils_clamp(minutes, 0, 999) * 60 + MathUtils_clamp(seconds, 0, 59);
    updateProgress(
      dispatch,
      [lbSet.p("completedSetTimer").record(newSeconds), lbModal.record(undefined)],
      "edit-set-timer"
    );
  };

  return (
    <View>
      <Text className="pb-2 font-bold">Edit recorded time</Text>
      <Text className="pb-2 text-xs text-text-secondary">(in mm:ss)</Text>
      <View className="flex-row items-center">
        <View className="flex-1">
          <Input
            type="tel"
            placeholder="00"
            value={minutesValue}
            inputSize="sm"
            labelSize="xs"
            changeType="oninput"
            identifier="set-timer-edit-minutes"
            changeHandler={(e) => {
              if (e.success) {
                setMinutesValue(e.data);
              }
            }}
          />
        </View>
        <View className="items-center justify-center" style={{ width: 16, height: 40 }}>
          <Text>:</Text>
        </View>
        <View className="flex-1">
          <Input
            type="tel"
            placeholder="00"
            value={secondsValue}
            inputSize="sm"
            labelSize="xs"
            changeType="oninput"
            identifier="set-timer-edit-seconds"
            changeHandler={(e) => {
              if (e.success) {
                setSecondsValue(e.data);
              }
            }}
          />
        </View>
      </View>
      <View className="flex-row justify-between mt-4">
        <Button
          name="set-timer-edit-clear"
          data-testid="set-timer-edit-clear"
          kind="grayv2"
          className="mr-3"
          onClick={onClear}
        >
          Clear
        </Button>
        <Button name="set-timer-edit-submit" data-testid="set-timer-edit-submit" kind="purple" onClick={onSave}>
          Save
        </Button>
      </View>
    </View>
  );
}
