import { h, JSX, Fragment } from "preact";
import { BottomSheet } from "./bottomSheet";
import { IProgram, ISettings } from "../types";
import { emptyProgramId, Program } from "../models/program";
import { HistoryRecordView } from "./historyRecord";
import { IDispatch } from "../ducks/types";
import { LinkButton } from "./linkButton";
import { useState } from "preact/hooks";
import { ModalChangeNextDay } from "./modalChangeNextDay";
import { IconSwap } from "./icons/iconSwap";
import { Tailwind } from "../utils/tailwindConfig";
import { IconPlus2 } from "./icons/iconPlus2";

interface IProps {
  isHidden: boolean;
  currentProgram?: IProgram;
  allPrograms: IProgram[];
  settings: ISettings;
  dispatch: IDispatch;
  onClose: () => void;
}

export function BottomSheetNextWorkout(props: IProps): JSX.Element {
  const [showChangeWorkout, setShowChangeWorkout] = useState(false);
  const fullProgram = props.currentProgram ? Program.fullProgram(props.currentProgram, props.settings) : undefined;

  const programDay = fullProgram ? Program.getProgramDay(fullProgram, fullProgram.nextDay) : undefined;
  const nextHistoryRecord = fullProgram ? Program.nextProgramRecord(fullProgram, props.settings) : undefined;

  const doesProgressNotMatchProgram =
    nextHistoryRecord &&
    (nextHistoryRecord.programId !== fullProgram?.id || nextHistoryRecord.day !== fullProgram.nextDay);

  return (
    <>
      <BottomSheet shouldShowClose={true} onClose={props.onClose} isHidden={props.isHidden}>
        <h3 className="pt-3 pb-4 text-lg font-semibold text-center">New Workout</h3>
        {doesProgressNotMatchProgram && (
          <div className="mx-4 mb-1 text-xs text-center text-grayv2-main">
            You currently have ongoing workout. Finish it first to see newly chosen program or a different day.
          </div>
        )}
        <div className="relative flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 pb-10 overflow-y-auto">
            {programDay && nextHistoryRecord && (
              <HistoryRecordView
                historyRecord={nextHistoryRecord}
                programDay={programDay}
                isOngoing={false}
                settings={props.settings}
                dispatch={props.dispatch}
              />
            )}
          </div>
          <div
            className="absolute bottom-0 left-0 flex justify-between w-full px-4 pt-4 pb-6"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.8)" }}
          >
            <div>
              <LinkButton name="change-next-day" data-cy="change-next-day" onClick={() => setShowChangeWorkout(true)}>
                <IconSwap color={Tailwind.colors().bluev2} className="inline-block pr-1" />
                Change next workout
              </LinkButton>
            </div>
            <div>
              <LinkButton
                name="start-empty-workout"
                data-cy="start-empty-workout"
                onClick={() => {
                  props.dispatch({ type: "StartProgramDayAction", programId: emptyProgramId });
                }}
              >
                <IconPlus2 color={Tailwind.colors().bluev2} className="inline-block pr-1" />
                Ad-Hoc Workout
              </LinkButton>
            </div>
          </div>
        </div>
      </BottomSheet>
      {showChangeWorkout && fullProgram && (
        <ModalChangeNextDay
          onClose={() => setShowChangeWorkout(false)}
          dispatch={props.dispatch}
          currentProgram={fullProgram}
          allPrograms={props.allPrograms}
          settings={props.settings}
        />
      )}
    </>
  );
}
