import { h, JSX } from "preact";
import { Modal } from "./modal";
import { IProgram, ISettings } from "../types";
import { NextDayPicker } from "./nextDayPicker";
import { LinkButton } from "./linkButton";
import { emptyProgramId } from "../models/program";

interface IModalChangeNextDayProps {
  initialCurrentProgramId?: string;
  allPrograms: IProgram[];
  settings: ISettings;
  onSelect: (programId: string, day: number) => void;
  onClose: () => void;
}

export function ModalChangeNextDay(props: IModalChangeNextDayProps): JSX.Element {
  return (
    <Modal noPaddings zIndex={60} shouldShowClose onClose={props.onClose} isFullWidth isFullHeight>
      <div className="mt-4 mb-1 text-lg font-semibold text-center">Change Next Workout</div>
      <div className="text-center">
        <LinkButton
          name="change-next-day-empty-program"
          className="mb-2 text-xs"
          onClick={() => {
            props.onSelect(emptyProgramId, 1);
            props.onClose();
          }}
        >
          Go without a program
        </LinkButton>
      </div>
      <NextDayPicker
        initialCurrentProgramId={props.initialCurrentProgramId}
        allPrograms={props.allPrograms}
        settings={props.settings}
        onSelect={(programId, day) => {
          props.onSelect(programId, day);
          props.onClose();
        }}
      />
    </Modal>
  );
}
