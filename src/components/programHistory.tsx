import { IDispatch } from "../ducks/types";
import { emptyProgramId, Program } from "../models/program";
import { Thunk } from "../ducks/thunks";
import { useState } from "react";
import { IProgram, IHistoryRecord, ISettings, IStats, ISubscription } from "../types";
import { HistoryRecordsList } from "./historyRecordsList";
import { ILoading } from "../models/state";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { IScreen, Screen } from "../models/screen";
import { Footer2View } from "./footer2";
import { HelpProgramHistory } from "./help/helpProgramHistory";
import { IconUser } from "./icons/iconUser";
import { ObjectUtils } from "../utils/object";
import { LinkButton } from "./linkButton";
import { ModalChangeNextDay } from "./modalChangeNextDay";
import { Markdown } from "./markdown";
import { GroupHeader } from "./groupHeader";
import { TouchableOpacity, View } from "react-native";
import { LftText } from "./lftText"; // Import LftText component

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
  const [visibleRecords, setVisibleRecords] = useState(20);

  const [showChangeWorkout, setShowChangeWorkout] = useState(false);
  const isUserLoading = ObjectUtils.values(props.loading.items).some((i) => i?.type === "fetchStorage" && !i.endTime);

  const doesProgressNotMatchProgram =
    nextHistoryRecord.programId !== props.program.id || nextHistoryRecord.day !== props.program.nextDay;

  return (
    <Surface
      onScroll={(atEnd: boolean) => {
        if (atEnd) {
          setVisibleRecords(visibleRecords + 20);
        }
      }}
      navbar={
        <NavbarView
          rightButtons={[
            <TouchableOpacity
              key={0}
              data-cy="navbar-user"
              className="p-2 nm-navbar-user"
              onPress={() => props.dispatch(Thunk.pushScreen("account"))}
            >
              <IconUser size={22} color={props.userId ? "#38A169" : isUserLoading ? "#607284" : "#E53E3E"} />
            </TouchableOpacity>,
          ]}
          loading={props.loading}
          dispatch={dispatch}
          helpContent={<HelpProgramHistory />}
          screenStack={props.screenStack}
          title="Workout History"
        />
      }
      footer={<Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
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
        <View className="flex flex-row w-full gap-4 mt-4">
          <View className="px-4 pb-2 text-xs">
            <LinkButton name="change-next-day" data-cy="change-next-day" onPress={() => setShowChangeWorkout(true)}>
              Change next workout
            </LinkButton>
          </View>
          <View className="px-4 pb-2 ml-auto text-xs text-right">
            <LinkButton
              name="start-empty-workout"
              data-cy="start-empty-workout"
              onPress={() => {
                dispatch({ type: "StartProgramDayAction", programId: emptyProgramId });
              }}
            >
              Ad-Hoc Workout
            </LinkButton>
          </View>
        </View>
      )}
      {weekDescription && (
        <View className="px-4 pb-2 text-sm">
          <GroupHeader name="Week Description" />
          <Markdown value={weekDescription} />
        </View>
      )}
      {doesProgressNotMatchProgram && (
        <LftText className="mx-4 mb-1 text-xs text-center text-grayv2-main">
          You currently have ongoing workout. Finish it first to see newly chosen program or a different day.
        </LftText>
      )}
      <HistoryRecordsList
        history={history}
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
