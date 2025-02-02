import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { Program } from "../models/program";
import { Thunk } from "../ducks/thunks";
import { IProgram, IHistoryRecord, ISettings, IStats, ISubscription } from "../types";
import { HistoryRecordsList } from "./historyRecordsList";
import { INavCommon } from "../models/state";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { HelpProgramHistory } from "./help/helpProgramHistory";
import { useGradualList } from "../utils/useGradualList";
import { IconUser } from "./icons/iconUser";
import { ObjectUtils } from "../utils/object";
import { Markdown } from "./markdown";
import { GroupHeader } from "./groupHeader";

interface IProps {
  program: IProgram;
  allPrograms: IProgram[];
  progress?: IHistoryRecord;
  editProgramId?: string;
  history: IHistoryRecord[];
  stats: IStats;
  userId?: string;
  settings: ISettings;
  subscription: ISubscription;
  navCommon: INavCommon;
  dispatch: IDispatch;
}

export function ProgramHistoryView(props: IProps): JSX.Element {
  const dispatch = props.dispatch;
  const sortedHistory = props.history.sort((a, b) => {
    return new Date(Date.parse(b.date)).getTime() - new Date(Date.parse(a.date)).getTime();
  });
  const weekDescription = Program.getProgramWeek(props.program, props.settings)?.description;
  const [containerRef, visibleRecords] = useGradualList(sortedHistory, 20, () => undefined);

  const isUserLoading = ObjectUtils.values(props.navCommon.loading.items).some(
    (i) => i?.type === "fetchStorage" && !i.endTime
  );

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
          navCommon={props.navCommon}
          dispatch={dispatch}
          helpContent={<HelpProgramHistory />}
          title="Workout History"
        />
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
    >
      {weekDescription && (
        <div className="px-4 pb-2 text-sm">
          <GroupHeader name="Week Description" />
          <Markdown value={weekDescription} />
        </div>
      )}
      <HistoryRecordsList
        history={sortedHistory}
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
