import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { emptyProgramId, Program } from "../models/program";
import { Thunk } from "../ducks/thunks";
import { useState } from "preact/hooks";
import { IProgram, IHistoryRecord, ISettings, IStats, ISubscription } from "../types";
import { HistoryRecordsList } from "./historyRecordsList";
import { ILoading } from "../models/state";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { IScreen, Screen } from "../models/screen";
import { Footer2View } from "./footer2";
import { HelpProgramHistory } from "./help/helpProgramHistory";
import { useGradualList } from "../utils/useGradualList";
import { IconUser } from "./icons/iconUser";
import { ObjectUtils } from "../utils/object";
import { LinkButton } from "./linkButton";
import { ModalChangeNextDay } from "./modalChangeNextDay";
import { Markdown } from "./markdown";
import { GroupHeader } from "./groupHeader";

interface IProps {
  program: IProgram;
  allPrograms: IProgram[];
  progress?: IHistoryRecord;
  editProgramId?: string;
  history: IHistoryRecord[];
  screenStack: IScreen[];
  stats: IStats;
  userId?: string;
  settings: ISettings;
  loading: ILoading;
  subscription: ISubscription;
  dispatch: IDispatch;
}

export function ProgramHistoryView(props: IProps): JSX.Element {
  const dispatch = props.dispatch;
  const sortedHistory = props.history.sort((a, b) => {
    return new Date(Date.parse(b.date)).getTime() - new Date(Date.parse(a.date)).getTime();
  });
  const weekDescription = Program.getProgramWeek(props.program, props.settings)?.description;
  const nextHistoryRecord = props.progress || Program.nextProgramRecord(props.program, props.settings);
  const history = [nextHistoryRecord, ...sortedHistory];
  const [containerRef, visibleRecords] = useGradualList(history, 20, () => undefined);

  const [showChangeWorkout, setShowChangeWorkout] = useState(false);
  const isUserLoading = ObjectUtils.values(props.loading.items).some((i) => i?.type === "fetchStorage" && !i.endTime);

  const doesProgressNotMatchProgram =
    nextHistoryRecord.programId !== props.program.id || nextHistoryRecord.day !== props.program.nextDay;

  return (
    <Surface
      ref={containerRef}
      navbar={
        <NavbarView
          rightButtons={[
            <button
              data-cy="navbar-user"
              className="p-2 nm-navbar-user"
              onClick={() => props.dispatch(Thunk.pushScreen("account"))}
            >
              <IconUser size={22} color={props.userId ? "#38A169" : isUserLoading ? "#607284" : "#E53E3E"} />
            </button>,
          ]}
          loading={props.loading}
          dispatch={dispatch}
          helpContent={<HelpProgramHistory />}
          screenStack={props.screenStack}
          title="Workout History"
        />
      }
      footer={
        <Footer2View
          currentProgram={props.program}
          settings={props.settings}
          dispatch={props.dispatch}
          screen={Screen.current(props.screenStack)}
        />
      }
      addons={
        <>
          {showChangeWorkout && (
            <ModalChangeNextDay
              onClose={() => setShowChangeWorkout(false)}
              dispatch={props.dispatch}
              currentProgram={props.program}
              allPrograms={props.allPrograms}
              settings={props.settings}
            />
          )}
        </>
      }
    >
      {props.progress == null && (
        <div className="flex w-full gap-4">
          <div className="px-4 pb-2 text-xs">
            <LinkButton name="change-next-day" data-cy="change-next-day" onClick={() => setShowChangeWorkout(true)}>
              Change next workout
            </LinkButton>
          </div>
          <div className="px-4 pb-2 ml-auto text-xs text-right">
            <LinkButton
              name="start-empty-workout"
              data-cy="start-empty-workout"
              onClick={() => {
                dispatch({ type: "StartProgramDayAction", programId: emptyProgramId });
              }}
            >
              Ad-Hoc Workout
            </LinkButton>
          </div>
        </div>
      )}
      {weekDescription && (
        <div className="px-4 pb-2 text-sm">
          <GroupHeader name="Week Description" />
          <Markdown value={weekDescription} />
        </div>
      )}
      {doesProgressNotMatchProgram && (
        <div className="mx-4 mb-1 text-xs text-center text-grayv2-main">
          You currently have ongoing workout. Finish it first to see newly chosen program or a different day.
        </div>
      )}
      <HistoryRecordsList
        history={history}
        program={props.program}
        subscription={props.subscription}
        progress={props.progress}
        settings={props.settings}
        dispatch={dispatch}
        visibleRecords={visibleRecords}
        currentUserId={props.userId}
      />
    </Surface>
  );
}
