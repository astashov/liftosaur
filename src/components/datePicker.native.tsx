import { JSX, useState } from "react";
import { Platform, Pressable } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Text } from "./primitives/text";
import { DateUtils_formatYYYYMMDD } from "../utils/date";

interface IDatePickerProps {
  value: number;
  onChange: (timestamp: number) => void;
  testID?: string;
}

export function DatePicker(props: IDatePickerProps): JSX.Element {
  const [show, setShow] = useState(false);
  const date = new Date(props.value);

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date): void => {
    if (Platform.OS === "android") {
      setShow(false);
    }
    if (event.type === "set" && selectedDate) {
      props.onChange(selectedDate.getTime());
    }
  };

  if (Platform.OS === "ios") {
    return <DateTimePicker testID={props.testID} value={date} mode="date" display="compact" onChange={handleChange} />;
  }

  return (
    <>
      <Pressable testID={props.testID} onPress={() => setShow(true)} className="py-2">
        <Text className="text-text-link">{DateUtils_formatYYYYMMDD(date)}</Text>
      </Pressable>
      {show && <DateTimePicker value={date} mode="date" display="default" onChange={handleChange} />}
    </>
  );
}
