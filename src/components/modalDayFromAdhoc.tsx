import { h, JSX, Fragment } from "preact";
import { Modal } from "./modal";
import { IHistoryRecord, IProgram, ISettings } from "../types";
import { NextDayPicker } from "./nextDayPicker";
import { LinkButton } from "./linkButton";
import { useState } from "preact/hooks";
import { ModalCreateProgram } from "./modalCreateProgram";
import { IDispatch } from "../ducks/types";
import { lb } from "lens-shmens";
import { EditProgram } from "../models/editProgram";
import { Program } from "../models/program";
import { updateState, IState } from "../models/state";
import { CollectionUtils } from "../utils/collection";

interface IModalChangeNextDayProps {
  initialCurrentProgramId?: string;
  allPrograms: IProgram[];
  settings: ISettings;
  record: IHistoryRecord;
  dispatch: IDispatch;
  onClose: () => void;
}

export function ModalDayFromAdhoc(props: IModalChangeNextDayProps): JSX.Element {
  const [showCreateProgramModal, setShowCreateProgramModal] = useState(false);

  return (
    <>
      <Modal noPaddings zIndex={60} shouldShowClose onClose={props.onClose} isFullWidth isFullHeight>
        <div className="mt-4 mb-3 text-lg font-semibold text-center">Program day from Adhoc workout</div>
        <div className="mx-4 mb-2 text-sm">
          <LinkButton
            name="create-program-from-adhoc"
            data-cy="create-program-from-adhoc"
            onClick={() => {
              setShowCreateProgramModal(true);
            }}
          >
            Create a new program with this workout
          </LinkButton>
        </div>
        <div className="mx-4 mb-1 text-sm">or select day to add after in the existing program:</div>
        <NextDayPicker
          initialCurrentProgramId={props.initialCurrentProgramId}
          allPrograms={props.allPrograms}
          settings={props.settings}
          onSelect={(programId, day) => {
            const program = CollectionUtils.findBy(props.allPrograms, "id", programId);
            if (program != null) {
              const { program: newProgram, dayData } = Program.addDayFromHistoryRecord(
                program,
                day,
                props.record,
                props.settings
              );
              EditProgram.updateProgram(props.dispatch, newProgram);
              let position =
                (newProgram.planner?.weeks.length ?? 0) > 1
                  ? `${newProgram.planner?.weeks[dayData.week - 1].name}, `
                  : "";
              position += newProgram.planner?.weeks[dayData.week - 1]?.days[dayData.dayInWeek - 1]?.name;
              alert(`Added to program '${newProgram.name}', at ${position}`);
            }
            props.onClose();
          }}
        />
      </Modal>
      {showCreateProgramModal && (
        <ModalCreateProgram
          isHidden={!showCreateProgramModal}
          onClose={() => setShowCreateProgramModal(false)}
          onSelect={(name) => {
            setShowCreateProgramModal(false);
            const program = Program.createFromHistoryRecord(name, props.record, props.settings);
            updateState(props.dispatch, [
              lb<IState>()
                .p("storage")
                .p("programs")
                .recordModify((pgms) => [...pgms, program]),
            ]);
            alert(`Created new program '${program.name}' with this workout`);
            props.onClose();
          }}
        />
      )}
    </>
  );
}
