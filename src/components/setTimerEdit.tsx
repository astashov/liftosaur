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
  isUnilateral: boolean;
  dispatch: IDispatch;
}

export function SetTimerEditContent(props: ISetTimerEditContentProps): JSX.Element {
  const { set, entryIndex, setIndex, isUnilateral, dispatch } = props;
  const initialSeconds = set.completedSetTimer ?? set.setTimer ?? 0;
  const initialLeftSeconds = set.completedSetTimerLeft ?? set.setTimer ?? 0;

  const [minutesValue, setMinutesValue] = useState(Math.floor(initialSeconds / 60).toString());
  const [secondsValue, setSecondsValue] = useState(StringUtils_pad((initialSeconds % 60).toString(), 2));
  const [leftMinutesValue, setLeftMinutesValue] = useState(Math.floor(initialLeftSeconds / 60).toString());
  const [leftSecondsValue, setLeftSecondsValue] = useState(StringUtils_pad((initialLeftSeconds % 60).toString(), 2));

  const lbSet = lb<IHistoryRecord>().p("entries").i(entryIndex).p("sets").i(setIndex);
  const lbModal = lb<IHistoryRecord>().pi("ui", {}).p("setTimerEditModal");

  // Write the value and clear the modal flag in a SINGLE dispatch. The web playground's dispatch applies each
  // action to a progress snapshot captured at render, so a second dispatch (e.g. a separate onClose) would read
  // the stale snapshot and clobber this write. Clearing the flag here is what closes the modal (unmount on web,
  // shouldGoBack pop on native) — no separate onClose() call needed.
  const onClear = (): void => {
    updateProgress(
      dispatch,
      [
        lbSet.p("completedSetTimer").record(undefined),
        lbSet.p("completedSetTimerLeft").record(undefined),
        lbModal.record(undefined),
      ],
      "clear-set-timer"
    );
  };

  const toSeconds = (minutes: string, seconds: string, fallback: number): number => {
    const m = Number(minutes);
    const s = Number(seconds);
    return isNaN(m) || isNaN(s) ? fallback : MathUtils_clamp(m, 0, 999) * 60 + MathUtils_clamp(s, 0, 59);
  };

  const onSave = (): void => {
    const newSeconds = toSeconds(minutesValue, secondsValue, initialSeconds);
    updateProgress(
      dispatch,
      [
        lbSet.p("completedSetTimer").record(newSeconds),
        ...(isUnilateral
          ? [lbSet.p("completedSetTimerLeft").record(toSeconds(leftMinutesValue, leftSecondsValue, initialLeftSeconds))]
          : []),
        lbModal.record(undefined),
      ],
      "edit-set-timer"
    );
  };

  const durationRow = (
    label: string | undefined,
    minutes: string,
    onMinutes: (v: string) => void,
    seconds: string,
    onSeconds: (v: string) => void,
    identifierPrefix: string
  ): JSX.Element => (
    <View className="flex-row items-center">
      {label != null && (
        <View className="justify-center" style={{ width: 20 }}>
          <Text className="text-xs text-text-secondary">{label}</Text>
        </View>
      )}
      <View className="flex-1">
        <Input
          type="tel"
          placeholder="00"
          value={minutes}
          inputSize="sm"
          labelSize="xs"
          changeType="oninput"
          identifier={`${identifierPrefix}-minutes`}
          changeHandler={(e) => {
            if (e.success) {
              onMinutes(e.data);
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
          value={seconds}
          inputSize="sm"
          labelSize="xs"
          changeType="oninput"
          identifier={`${identifierPrefix}-seconds`}
          changeHandler={(e) => {
            if (e.success) {
              onSeconds(e.data);
            }
          }}
        />
      </View>
    </View>
  );

  return (
    <View>
      <Text className="pb-2 font-bold">Edit recorded time</Text>
      <Text className="pb-2 text-xs text-text-secondary">(in mm:ss)</Text>
      {isUnilateral && (
        <View className="pb-2">
          {durationRow(
            "L",
            leftMinutesValue,
            setLeftMinutesValue,
            leftSecondsValue,
            setLeftSecondsValue,
            "set-timer-edit-left"
          )}
        </View>
      )}
      {durationRow(
        isUnilateral ? "R" : undefined,
        minutesValue,
        setMinutesValue,
        secondsValue,
        setSecondsValue,
        "set-timer-edit"
      )}
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
