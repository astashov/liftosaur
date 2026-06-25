import { JSX, useEffect, useState } from "react";
import { View } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { lb } from "lens-shmens";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { Text } from "../../components/primitives/text";
import { Button } from "../../components/button";
import { Input } from "../../components/input";
import { Progress_getProgress } from "../../models/progress";
import { updateProgress } from "../../models/state";
import { IHistoryRecord } from "../../types";
import { MathUtils_clamp } from "../../utils/math";
import { StringUtils_pad } from "../../utils/string";
import type { IRootStackParamList } from "../types";

export function NavModalSetTimerEdit(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "setTimerEditModal";
    params: IRootStackParamList["setTimerEditModal"];
  }>();
  const { entryIndex, setIndex } = route.params;

  const progress = Progress_getProgress(state);
  const set = progress?.entries[entryIndex]?.sets[setIndex];
  const initialSeconds = set?.completedSetTimer ?? set?.setTimer ?? 0;

  const [minutesValue, setMinutesValue] = useState(Math.floor(initialSeconds / 60).toString());
  const [secondsValue, setSecondsValue] = useState(StringUtils_pad((initialSeconds % 60).toString(), 2));

  const shouldGoBack = set == null;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack) {
    return <></>;
  }

  const onClose = (): void => {
    navigation.goBack();
  };

  const onClear = (): void => {
    updateProgress(
      dispatch,
      [lb<IHistoryRecord>().p("entries").i(entryIndex).p("sets").i(setIndex).p("completedSetTimer").record(undefined)],
      "clear-set-timer"
    );
    navigation.goBack();
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
      [lb<IHistoryRecord>().p("entries").i(entryIndex).p("sets").i(setIndex).p("completedSetTimer").record(newSeconds)],
      "edit-set-timer"
    );
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true}>
      <FormSheet>
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
      </FormSheet>
    </ModalScreenContainer>
  );
}
