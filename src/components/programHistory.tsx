import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { Program } from "../models/program";
import { Thunk } from "../ducks/thunks";
import { useState, useEffect, useRef } from "preact/hooks";
import { IProgram, IHistoryRecord, ISettings, IStats } from "../types";
import { HistoryRecordsList } from "./historyRecordsList";
import { IAllComments, IAllLikes, IFriendUser, ILoading } from "../models/state";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { IScreen } from "../models/screen";
import { Footer2View } from "./footer2";
import { IconDoc } from "./icons/iconDoc";
import { IconRuler } from "./icons/iconRuler";
import { FooterButton } from "./footerButton";
import { rightFooterButtons } from "./rightFooterButtons";
import { HelpProgramHistory } from "./help/helpProgramHistory";
import { BottomSheet } from "./bottomSheet";
import { BottomSheetItem } from "./bottomSheetItem";
import { IconEditSquare } from "./icons/iconEditSquare";

interface IProps {
  program: IProgram;
  progress?: IHistoryRecord;
  history: IHistoryRecord[];
  screenStack: IScreen[];
  friendsHistory: Partial<Record<string, IFriendUser>>;
  stats: IStats;
  comments: IAllComments;
  likes: IAllLikes;
  userId?: string;
  settings: ISettings;
  loading: ILoading;
  dispatch: IDispatch;
}

export function ProgramHistoryView(props: IProps): JSX.Element {
  const dispatch = props.dispatch;
  const sortedHistory = props.history.sort((a, b) => {
    return new Date(Date.parse(b.date)).getTime() - new Date(Date.parse(a.date)).getTime();
  });
  const nextHistoryRecord = props.progress || Program.nextProgramRecord(props.program, props.settings);
  const [visibleRecords, setVisibleRecords] = useState<number>(20);
  const visibleRecordsRef = useRef<number>(visibleRecords);
  const containerRef = useRef<HTMLElement>();

  useEffect(() => {
    function scrollHandler(): void {
      if (window.pageYOffset + window.innerHeight > containerRef.current.clientHeight - 500) {
        const vr = Math.min(visibleRecordsRef.current + 20, history.length);
        if (visibleRecordsRef.current !== vr) {
          const enddate = sortedHistory[visibleRecordsRef.current - 1]?.date;
          const startdate = sortedHistory[vr - 1]?.date;
          dispatch(Thunk.fetchFriendsHistory(startdate || "2019-01-01T00:00:00.000Z", enddate));
          dispatch(Thunk.fetchLikes(startdate || "2019-01-01T00:00:00.000Z", enddate));
          dispatch(Thunk.getComments(startdate || "2019-01-01T00:00:00.000Z", enddate));
          setVisibleRecords(vr);
          visibleRecordsRef.current = vr;
        }
      }
    }
    window.addEventListener("scroll", scrollHandler);
    return () => window.removeEventListener("scroll", scrollHandler);
  }, []);

  const history = [nextHistoryRecord, ...sortedHistory];
  const [showProgramBottomSheet, setShowProgramBottomSheet] = useState(false);

  return (
    <Surface
      ref={containerRef}
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={dispatch}
          helpContent={<HelpProgramHistory />}
          screenStack={props.screenStack}
          title="Workout History"
        />
      }
      footer={
        <Footer2View
          dispatch={props.dispatch}
          onCtaClick={() => props.dispatch({ type: "StartProgramDayAction" })}
          ctaTitle={props.progress ? "Continue Workout" : "Start Workout"}
          leftButtons={[
            <FooterButton icon={<IconDoc />} text="Program" onClick={() => setShowProgramBottomSheet(true)} />,
            <FooterButton
              icon={<IconRuler />}
              text="Measures"
              onClick={() => dispatch(Thunk.pushScreen("measurements"))}
            />,
          ]}
          rightButtons={rightFooterButtons({ dispatch: props.dispatch })}
        />
      }
      addons={
        <BottomSheet isHidden={!showProgramBottomSheet} onClose={() => setShowProgramBottomSheet(false)}>
          <div className="p-4">
            <BottomSheetItem
              className="choose-program"
              title="Choose Another Program"
              isFirst={true}
              icon={<IconDoc />}
              description="Select a program for the next workout."
              onClick={() => dispatch(Thunk.pushScreen("programs"))}
            />
            <BottomSheetItem
              className="edit-program"
              title="Edit Current Program"
              icon={<IconEditSquare />}
              description={`Edit the current program '${props.program.name}'.`}
              onClick={() => Program.editAction(dispatch, props.program.id)}
            />
          </div>
        </BottomSheet>
      }
    >
      <HistoryRecordsList
        comments={props.comments}
        history={history}
        settings={props.settings}
        dispatch={dispatch}
        likes={props.likes}
        visibleRecords={visibleRecordsRef.current}
        currentUserId={props.userId}
        friendsHistory={props.friendsHistory}
      />
    </Surface>
  );
}
