import { h, JSX } from "preact";
import { Modal } from "./modal";
import { IProgram, ISettings } from "../types";
import { NextDayPicker } from "./nextDayPicker";

interface IModalProgramNextDayProps {
  initialCurrentProgramId?: string;
  allPrograms: IProgram[];
  settings: ISettings;
  onSelect: (programId: string, day: number) => void;
  onClose: () => void;
}

export function ModalProgramNextDay(props: IModalProgramNextDayProps): JSX.Element {
  return (
    <Modal noPaddings shouldShowClose onClose={props.onClose} isFullWidth>
      <div className="mt-4 mb-1 text-lg font-semibold text-center">Change Next Day</div>
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
