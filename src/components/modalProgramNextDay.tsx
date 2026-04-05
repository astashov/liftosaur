import type { JSX } from "react";
import { Modal } from "./modal";
import { IProgram, ISettings, IStats } from "../types";
import { NextDayPicker } from "./nextDayPicker";

interface IModalProgramNextDayProps {
  initialCurrentProgramId?: string;
  allPrograms: IProgram[];
  stats: IStats;
  settings: ISettings;
  onSelect: (programId: string, day: number) => void;
  onClose: () => void;
}

export function ModalProgramNextDayContent(props: IModalProgramNextDayProps): JSX.Element {
  return (
    <>
      <div className="mt-4 mb-1 text-lg font-semibold text-center">Change Next Day</div>
      <NextDayPicker
        stats={props.stats}
        initialCurrentProgramId={props.initialCurrentProgramId}
        allPrograms={props.allPrograms}
        settings={props.settings}
        onSelect={(programId, day) => {
          props.onSelect(programId, day);
          props.onClose();
        }}
      />
    </>
  );
}

export function ModalProgramNextDay(props: IModalProgramNextDayProps): JSX.Element {
  return (
    <Modal noPaddings shouldShowClose onClose={props.onClose} isFullWidth>
      <ModalProgramNextDayContent {...props} />
    </Modal>
  );
}
