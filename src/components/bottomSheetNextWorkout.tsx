import { JSX, memo, useState } from "react";
import { BottomSheet } from "./bottomSheet";
import { IProgram, ISettings, IStats } from "../types";
import {
  emptyProgramId,
  Program_evaluate,
  Program_nextHistoryRecord,
  Program_isEmpty,
  Program_selectProgram,
} from "../models/program";
import { IDispatch } from "../ducks/types";
import { LinkButton } from "./linkButton";
import { IconSwap } from "./icons/iconSwap";
import { Tailwind_colors } from "../utils/tailwindConfig";
import { IconPlus2 } from "./icons/iconPlus2";
import { ComparerUtils_noFns } from "../utils/comparer";
import { EditProgram_setNextDay } from "../models/editProgram";
import { ModalChangeNextDay } from "./modalChangeNextDay";
import { Thunk_startProgramDay } from "../ducks/thunks";
import { HistoryEntryView } from "@crossplatform/components/HistoryEntryView";

interface IProps {
  isHidden: boolean;
  currentProgram?: IProgram;
  allPrograms: IProgram[];
  settings: ISettings;
  stats: IStats;
  dispatch: IDispatch;
  onClose: () => void;
}

export const BottomSheetNextWorkout = memo((props: IProps): JSX.Element => {
  const [showChangeWorkout, setShowChangeWorkout] = useState(false);
  const evaluatedProgram = props.currentProgram ? Program_evaluate(props.currentProgram, props.settings) : undefined;

  const nextHistoryRecord = props.currentProgram
    ? Program_nextHistoryRecord(props.currentProgram, props.settings, props.stats)
    : undefined;

  const doesProgressNotMatchProgram =
    nextHistoryRecord &&
    (nextHistoryRecord.programId !== props.currentProgram?.id ||
      nextHistoryRecord.day !== props.currentProgram.nextDay);

  return (
    <>
      <BottomSheet shouldShowClose={true} onClose={props.onClose} isHidden={props.isHidden}>
        <h3 className="pt-3 pb-4 text-lg font-semibold text-center">New Workout</h3>
        {doesProgressNotMatchProgram && (
          <div className="mx-4 mb-1 text-xs text-center text-text-secondary">
            You currently have ongoing workout. Finish it first to see newly chosen program or a different day.
          </div>
        )}
        {Program_isEmpty(props.currentProgram) && (
          <div className="mx-4 mb-1 text-xs text-center text-text-secondary">No program currently selected.</div>
        )}
        <div className="relative flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 pb-10 overflow-y-auto">
            {nextHistoryRecord && (
              <div className="p-4 mx-4 mb-2 border rounded-2xl bg-background-subtlecardpurple border-border-cardpurple">
                <div className="text-lg font-bold text-text-primary">{nextHistoryRecord.dayName}</div>
                <div className="mb-2 text-sm text-text-secondary">{nextHistoryRecord.programName}</div>
                {nextHistoryRecord.entries.map((entry, i) => (
                  <HistoryEntryView
                    key={entry.id}
                    entry={entry}
                    isNext={true}
                    isLast={i === nextHistoryRecord!.entries.length - 1}
                    settings={props.settings}
                    showNotes={false}
                  />
                ))}
                <button
                  className="w-full py-3 mt-4 font-bold text-base rounded-xl bg-button-primarybackground text-button-primarylabel"
                  onClick={() => props.dispatch(Thunk_startProgramDay())}
                >
                  Start
                </button>
              </div>
            )}
          </div>
          <div className="absolute bottom-0 left-0 flex justify-between w-full px-4 pt-4 pb-6 text-sm bg-background-default">
            <div>
              <LinkButton name="change-next-day" data-cy="change-next-day" onClick={() => setShowChangeWorkout(true)}>
                <IconSwap color={Tailwind_colors().blue[400]} className="inline-block pr-1" />
                Change next workout
              </LinkButton>
            </div>
            <div>
              <LinkButton
                name="start-empty-workout"
                data-cy="start-empty-workout"
                onClick={() => {
                  props.dispatch(Thunk_startProgramDay(emptyProgramId));
                }}
              >
                <IconPlus2 color={Tailwind_colors().blue[400]} className="inline-block pr-1" />
                Ad-Hoc Workout
              </LinkButton>
            </div>
          </div>
        </div>
      </BottomSheet>
      {showChangeWorkout && evaluatedProgram && (
        <ModalChangeNextDay
          stats={props.stats}
          onClose={() => setShowChangeWorkout(false)}
          initialCurrentProgramId={evaluatedProgram.id}
          onSelect={(programId, day) => {
            Program_selectProgram(props.dispatch, programId);
            EditProgram_setNextDay(props.dispatch, programId, day);
          }}
          allPrograms={props.allPrograms}
          settings={props.settings}
        />
      )}
    </>
  );
}, ComparerUtils_noFns);
