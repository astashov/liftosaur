import { JSX, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { DateUtils_formatYYYYMMDD } from "../utils/date";
import { Input } from "./input";
import { MathUtils_clamp } from "../utils/math";

interface IModalDateContentProps {
  dispatch: IDispatch;
  date: string;
  time: number;
  onDone?: () => void;
}

export function ModalDateContent(props: IModalDateContentProps): JSX.Element {
  const initialDate = new Date(Date.parse(props.date));
  const formattedDate = DateUtils_formatYYYYMMDD(initialDate);
  const hours = Math.floor(props.time / 3600000);
  const hoursStr = hours.toString().padStart(2, "0");
  const minutes = Math.floor((props.time % 3600000) / 60000);
  const minutesStr = minutes.toString().padStart(2, "0");

  const [dateValue, setDateValue] = useState(formattedDate);
  const [hoursValue, setHoursValue] = useState(hoursStr);
  const [minutesValue, setMinutesValue] = useState(minutesStr);

  return (
    <View>
      <Text className="pb-2 font-bold">Please enter new date</Text>
      <Input
        type="date"
        placeholder="YYYY-MM-DD"
        value={dateValue}
        changeHandler={(e) => {
          if (e.success) {
            setDateValue(e.data);
          }
        }}
      />
      <Text className="pt-2 font-bold">Please enter workout length</Text>
      <Text className="pb-2 text-xs text-text-secondary">(in hh:mm)</Text>
      <View className="flex-row items-center">
        <View className="flex-1">
          <Input
            type="tel"
            placeholder="00"
            value={hoursValue}
            inputSize="sm"
            labelSize="xs"
            changeHandler={(e) => {
              if (e.success) {
                setHoursValue(e.data);
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
            value={minutesValue}
            inputSize="sm"
            labelSize="xs"
            changeHandler={(e) => {
              if (e.success) {
                setMinutesValue(e.data);
              }
            }}
          />
        </View>
      </View>
      <View className="flex-row justify-end mt-4">
        <Button
          name="modal-date-cancel"
          kind="grayv2"
          className="mr-3"
          onClick={() => {
            props.dispatch({ type: "ConfirmDate", date: undefined, time: undefined });
            props.onDone?.();
          }}
        >
          Cancel
        </Button>
        <Button
          name="modal-date-submit"
          kind="purple"
          onClick={() => {
            const newHoursValue = Number(hoursValue);
            const newMinutesValue = Number(minutesValue);
            const newTime =
              isNaN(newHoursValue) || isNaN(newMinutesValue)
                ? props.time
                : MathUtils_clamp(newHoursValue, 0, 99) * 3600000 + MathUtils_clamp(newMinutesValue, 0, 60) * 60000;
            props.dispatch({ type: "ConfirmDate", date: dateValue, time: newTime });
            props.onDone?.();
          }}
        >
          Save
        </Button>
      </View>
    </View>
  );
}
