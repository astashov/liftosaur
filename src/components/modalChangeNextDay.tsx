import { h, JSX } from "preact";
import { Modal } from "./modal";
import { IProgram, ISettings } from "../types";
import { NextDayPicker } from "./nextDayPicker";

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
      <div className="my-4 text-lg font-semibold text-center">Change Next Workout</div>
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
