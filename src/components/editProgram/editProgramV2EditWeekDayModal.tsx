import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { IPlannerProgram } from "../../types";
import { Button } from "../button";
import { Input } from "../input";
import { Modal } from "../modal";

interface IProps {
  onSelect: (name: string) => void;
  onClose: () => void;
  plannerProgram: IPlannerProgram;
  weekIndex: number;
  dayIndex?: number;
}

export function EditProgramV2EditWeekDayModal(props: IProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);

  const nameModal =
    props.dayIndex == null
      ? props.plannerProgram.weeks[props.weekIndex]?.name
      : props.plannerProgram.weeks[props.weekIndex]?.days[props.dayIndex]?.name ?? "";

  const title = props.dayIndex == null ? "Edit Week" : "Edit Day";

  return (
    <Modal onClose={props.onClose} shouldShowClose={true}>
      <h3 className="pb-2 text-xl font-bold text-center">
        {title} "{nameModal}"
      </h3>
      <Input
        label="Day Name"
        data-cy="modal-day-name-input"
        ref={textInput}
        defaultValue={nameModal}
        type="text"
        required={true}
        requiredMessage="Please enter a name for a day"
      />
      <p className="mt-4 text-center">
        <Button
          name="modal-edit-day-v2-cancel"
          data-cy="modal-edit-day-v2-cancel"
          type="button"
          kind="grayv2"
          className="mr-3"
          onClick={props.onClose}
        >
          Cancel
        </Button>
        <Button
          name="modal-edit-day-v2-submit"
          data-cy="modal-edit-day-v2-submit"
          type="button"
          kind="orange"
          className="ls-edit-davv2-modal-submit"
          onClick={() => {
            if (textInput.current.value) {
              props.onSelect(textInput.current.value);
            }
          }}
        >
          Update
        </Button>
      </p>
    </Modal>
  );
}
