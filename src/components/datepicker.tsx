import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { LftText } from "./lftText";
import { DateUtils } from "../utils/date";
import { Platform, TouchableOpacity } from "react-native";

interface IDatepickerProps {
  value: number;
  onChange: (timestamp: number) => void;
}

export function Datepicker(props: IDatepickerProps): JSX.Element {
  const [show, setShow] = useState(false);

  const datepicker = (
    <DateTimePicker
      value={new Date(props.value)}
      mode="date"
      className="inline-block py-2 text-bluev2"
      data-cy="input-stats-date"
      onChange={(e) => {
        props.onChange(e.nativeEvent.timestamp);
      }}
    />
  );

  return Platform.OS === "ios" ? (
    datepicker
  ) : (
    <>
      <TouchableOpacity onPress={() => setShow(!show)}>
        <LftText>{DateUtils.formatYYYYMMDD(props.value)}</LftText>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={new Date(props.value)}
          mode="date"
          className="inline-block py-2 text-bluev2"
          data-cy="input-stats-date"
          onChange={(e) => {
            props.onChange(e.nativeEvent.timestamp);
          }}
        />
      )}
    </>
  );
}
