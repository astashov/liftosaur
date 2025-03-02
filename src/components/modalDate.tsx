import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { Modal } from "./modal";
import { DateUtils } from "../utils/date";
import { Input } from "./input";
import { MathUtils } from "../utils/math";

interface IModalDateProps {
  dispatch: IDispatch;
  date: string;
  time: number;
  isHidden: boolean;
}

export function ModalDate(props: IModalDateProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  const hoursInput = useRef<HTMLInputElement>(null);
  const minutesInput = useRef<HTMLInputElement>(null);
  const date = new Date(Date.parse(props.date));
  const formattedDate = DateUtils.formatYYYYMMDD(date);
  const hours = Math.floor(props.time / 3600000);
  const hoursStr = hours.toString().padStart(2, "0");
  const minutes = Math.floor((props.time % 3600000) / 60000);
  const minutesStr = minutes.toString().padStart(2, "0");
  return (
    <Modal isHidden={props.isHidden} autofocusInputRef={textInput}>
      <form onSubmit={(e) => e.preventDefault()}>
        <h3 className="pb-2 font-bold">Please enter new date</h3>
        <input
          ref={textInput}
          className="block w-full px-4 py-2 leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline"
          type="date"
          placeholder="Date"
          value={formattedDate}
        />
        <h3 className="pt-2 font-bold">Please enter workout length</h3>
        <div className="pb-2 text-xs text-grayv2-main">(in hh:mm)</div>
        <div className="flex text-center">
          <div className="flex-1">
            <Input type="tel" placeholder="00" defaultValue={hoursStr} inputSize="sm" labelSize="xs" ref={hoursInput} />
          </div>
          <div className="flex items-center justify-center w-4 text-center" style={{ height: "40px" }}>
            <span className="align-middle">:</span>
          </div>
          <div className="flex-1">
            <Input
              type="tel"
              placeholder="00"
              defaultValue={minutesStr}
              inputSize="sm"
              labelSize="xs"
              ref={minutesInput}
            />
          </div>
        </div>
        <div className="mt-4 text-right">
          <Button
            name="modal-date-cancel"
            type="button"
            kind="grayv2"
            className="mr-3"
            onClick={() => {
              props.dispatch({ type: "ConfirmDate", date: undefined, time: undefined });
            }}
          >
            Cancel
          </Button>
          <Button
            name="modal-date-submit"
            kind="orange"
            type="submit"
            className="ls-modal-set-date"
            onClick={() => {
              const newDate = textInput.current?.value;
              const newHoursValue = Number(hoursInput.current?.value);
              const newMinutesValue = Number(minutesInput.current?.value);
              const newTime =
                isNaN(newHoursValue) || isNaN(newMinutesValue)
                  ? props.time
                  : MathUtils.clamp(newHoursValue, 0, 99) * 3600000 + MathUtils.clamp(newMinutesValue, 0, 60) * 60000;
              props.dispatch({ type: "ConfirmDate", date: newDate, time: newTime });
            }}
          >
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
