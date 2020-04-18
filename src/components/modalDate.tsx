import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { Modal } from "./modal";
import { DateUtils } from "../utils/date";

export function ModalDate(props: { dispatch: IDispatch; date: string }): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  const date = new Date(Date.parse(props.date));
  const formattedDate = DateUtils.formatYYYYMMDD(date);
  return (
    <Modal>
      <h3 className="pb-2 font-bold">Please enter new date</h3>
      <form>
        <input
          ref={textInput}
          className="block w-full px-4 py-2 leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline"
          type="date"
          placeholder="Date"
          value={formattedDate}
          autofocus
        />
        <div className="mt-4 text-right">
          <Button
            type="button"
            kind="gray"
            className="mr-3"
            onClick={() => {
              props.dispatch({ type: "ConfirmDate", date: undefined });
            }}
          >
            Cancel
          </Button>
          <Button
            kind="green"
            type="submit"
            onClick={() => {
              const value = textInput.current?.value;
              props.dispatch({ type: "ConfirmDate", date: value });
            }}
          >
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
