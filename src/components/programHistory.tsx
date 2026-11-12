import { JSX, useCallback, useEffect, useRef, useState } from "react";
import { useTimedMemo } from "../utils/useTimedMemo";
import { usePerfScrollMarkers } from "../utils/usePerfScrollMarkers";
import { Pressable, View } from "react-native";
import { ISocialState, SocialState_homePage } from "../models/socialState";
import { FeedMerge_rowKey, FeedMerge_rows, IFeedRow } from "../models/feedMerge";
import { FeedWorkout_key } from "../models/feedWorkout";
import { FeedWorkoutCard } from "./social/feedWorkoutCard";
import { Thunk_loadFeed, Thunk_loadFollows, Thunk_loadOwnReactions, Thunk_react } from "../ducks/socialThunks";
import { Thunk_pushScreen } from "../ducks/thunks";
import { IconFilter } from "./icons/iconFilter";
import { LegendList, LegendListRef } from "@legendapp/list";
import { IDispatch } from "../ducks/types";
import { IProgram, IHistoryRecord, ISettings, ISubscription } from "../types";
import { INavCommon, IState, updateState } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";
import { History_getHistoryRecordsForTimerange, History_getHomeAggregates } from "../models/history";
import { WeekInsights } from "./weekInsights";
import { lb } from "lens-shmens";
import { WeekCalendar } from "./weekCalendar";
import { HistoryRecordsNullState } from "./historyRecordsNullState";
import { Progress_isCurrent } from "../models/progress";
import { Program_nextHistoryRecord } from "../models/program";
import { navigateToModal } from "../navigation/navigationService";
import { useTrackedState } from "../navigation/TrackedStateContext";
import { HistoryRecordView } from "./historyRecord";
import { Program_evaluate, Program_getProgramDay } from "../models/program";

interface IProps {
  program: IProgram;
  progress?: IHistoryRecord;
  history: IHistoryRecord[];
  settings: ISettings;
  subscription: ISubscription;
  navCommon: INavCommon;
  dispatch: IDispatch;
  initialHistoryRecordId?: number;
  social?: ISocialState;
}

const ownReactionsWindow = 50;

export function getWeekHistory(
  history: IHistoryRecord[],
  firstDayOfWeek: number,
  startWeekFromMonday?: boolean
): IHistoryRecord[] {
  return History_getHistoryRecordsForTimerange(history, firstDayOfWeek, "week", startWeekFromMonday);
}

export function ProgramHistoryView(props: IProps): JSX.Element {
  const dispatch = props.dispatch;
  const aggregates = useTimedMemo(
    "programHistory.aggregates",
    () => History_getHomeAggregates(props.history, !!props.settings.startWeekFromMonday),
    [props.history, props.settings.startWeekFromMonday]
  );
  const { sortedHistoryDesc, weeksData, prs } = aggregates;
  const { firstDayOfWeeks, historyRecordDateToFirstDayOfWeek, firstDayOfWeekToHistoryRecord } = weeksData;

  const sortedHistory = useTimedMemo(
    "programHistory.sortedHistory",
    () => {
      if (!props.progress && (!props.program || sortedHistoryDesc.length === 0)) {
        return sortedHistoryDesc;
      }
      const arr = sortedHistoryDesc.slice();
      if (props.progress) {
        arr.unshift(props.progress);
      } else if (props.program) {
        arr.unshift(Program_nextHistoryRecord(props.program, props.settings, props.navCommon.stats));
      }
      return arr;
    },
    [sortedHistoryDesc, props.progress, props.program, props.settings, props.navCommon.stats]
  );

  const social = props.social;
  const userId = props.navCommon.userId;
  const homePage = social?.pages[SocialState_homePage];
  const hasFollowing = (social?.follows?.following.length ?? 0) > 0;
  const hasFollowers = (social?.follows?.followers.length ?? 0) > 0;
  const rows = useTimedMemo(
    "programHistory.rows",
    () => {
      const head = sortedHistory.length > sortedHistoryDesc.length ? sortedHistory[0] : undefined;
      const merged = FeedMerge_rows({
        own: sortedHistoryDesc,
        friendKeys: homePage?.keys ?? [],
        workouts: social?.workouts ?? {},
        hasMoreFriends: hasFollowing && (homePage?.hasMore ?? false),
        hiddenOwners: social?.hiddenOwners ?? [],
        selfId: userId,
      });
      return head != null ? [{ kind: "own" as const, record: head }, ...merged] : merged;
    },
    [sortedHistory, sortedHistoryDesc, homePage, social?.workouts, social?.hiddenOwners, hasFollowing, userId]
  );

  useEffect(() => {
    if (userId != null) {
      dispatch(Thunk_loadFollows());
      dispatch(Thunk_loadFeed(SocialState_homePage, true));
    }
  }, [userId]);

  useEffect(() => {
    if (userId != null && hasFollowers) {
      dispatch(Thunk_loadOwnReactions(sortedHistoryDesc.slice(0, ownReactionsWindow).map((r) => r.id)));
    }
  }, [userId, hasFollowers, sortedHistoryDesc]);

  const [selectedFirstDayOfWeek, setSelectedWeekFirstDay] = useState(firstDayOfWeeks[firstDayOfWeeks.length - 1]);
  const previousWeekFirstDayDate = new Date(selectedFirstDayOfWeek);
  previousWeekFirstDayDate.setDate(previousWeekFirstDayDate.getDate() - 7);
  const previousWeekFirstDay = previousWeekFirstDayDate.getTime();
  const [selectedWeekCalendarFirstDayOfWeek, setSelectedWeekCalendarFirstDayOfWeek] = useState(selectedFirstDayOfWeek);

  const thisWeekHistory = useTimedMemo(
    "programHistory.thisWeekHistory",
    () => getWeekHistory(sortedHistory, selectedFirstDayOfWeek, props.settings.startWeekFromMonday),
    [sortedHistory, selectedFirstDayOfWeek, props.settings.startWeekFromMonday]
  );
  const lastWeekHistory = useTimedMemo(
    "programHistory.lastWeekHistory",
    () => getWeekHistory(sortedHistory, previousWeekFirstDay, props.settings.startWeekFromMonday),
    [sortedHistory, previousWeekFirstDay, props.settings.startWeekFromMonday]
  );
  const loadingItems = props.navCommon.loading.items;
  const loadingKeys = Object.keys(loadingItems).filter((k) => loadingItems[k]?.endTime == null);
  const isLoading = Object.keys(loadingKeys).length > 0;

  const programDay = useTimedMemo(
    "programHistory.programDay",
    () => {
      const program = Program_evaluate(props.program, props.settings);
      return Program_getProgramDay(program, program.nextDay);
    },
    [props.program, props.settings]
  );
  const isOngoing = !!(props.progress && Progress_isCurrent(props.progress));

  const flatListRef = useRef<LegendListRef>(null);
  const historyRecordDateToFirstDayOfWeekRef = useRef(historyRecordDateToFirstDayOfWeek);
  historyRecordDateToFirstDayOfWeekRef.current = historyRecordDateToFirstDayOfWeek;
  const selectedFirstDayOfWeekRef = useRef(selectedFirstDayOfWeek);
  selectedFirstDayOfWeekRef.current = selectedFirstDayOfWeek;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ item: IFeedRow }> }) => {
    const firstOwn = viewableItems.find((v) => v.item.kind === "own")?.item;
    if (firstOwn != null && firstOwn.kind === "own") {
      const firstVisibleRecord = firstOwn.record;
      const firstDayOfWeek = historyRecordDateToFirstDayOfWeekRef.current[firstVisibleRecord.id];
      if (firstDayOfWeek != null && firstDayOfWeek !== selectedFirstDayOfWeekRef.current) {
        setSelectedWeekFirstDay(firstDayOfWeek);
      }
    }
  }).current;

  const initialHistoryRecordId = props.initialHistoryRecordId;

  const [initialScrollIndex, setInitialScrollIndex] = useState(() => {
    if (initialHistoryRecordId == null) {
      return 0;
    }
    const idx = rows.findIndex((row) => row.kind === "own" && row.record.id === initialHistoryRecordId);
    return idx >= 0 ? idx : 0;
  });
  const [listRemountKey, setListRemountKey] = useState(0);

  const trackedState = useTrackedState();
  const scrollToRecordId = trackedState.scrollToHistoryRecordId;
  useEffect(() => {
    if (scrollToRecordId != null) {
      updateState(props.dispatch, [lb<IState>().p("scrollToHistoryRecordId").record(undefined)], "Clear scroll target");
      const index = rows.findIndex((row) => row.kind === "own" && row.record.id === scrollToRecordId);
      if (index >= 0) {
        setInitialScrollIndex(index);
        setListRemountKey((k) => k + 1);
      }
    }
  }, [scrollToRecordId]);

  useNavOptions({ navHidden: true });

  const socialReactions = social?.reactions;
  const socialOwners = social?.owners;
  const renderItem = useCallback(
    ({ item }: { item: IFeedRow }) => {
      if (item.kind === "friend") {
        const workout = item.workout;
        return (
          <View className="mx-4 mb-6">
            <FeedWorkoutCard
              workout={workout}
              nickname={socialOwners?.[workout.ownerId]?.nickname}
              reactions={socialReactions?.[item.key]}
              settings={props.settings}
              now={Date.now()}
              maxExercises={3}
              showIdentity={true}
              onOpen={() =>
                dispatch(Thunk_pushScreen("friendWorkout", { ownerId: workout.ownerId, recordId: workout.recordId }))
              }
              onOpenOwner={() => dispatch(Thunk_pushScreen("friendProfile", { userId: workout.ownerId }))}
              onReact={(reaction) => dispatch(Thunk_react(workout.ownerId, workout.recordId, reaction))}
            />
          </View>
        );
      }
      return (
        <View className="mx-4 mb-6">
          <HistoryRecordView
            isOngoing={isOngoing}
            showTitle={true}
            programDay={programDay}
            prs={prs}
            settings={props.settings}
            historyRecord={item.record}
            reactions={userId != null ? socialReactions?.[FeedWorkout_key(userId, item.record.id)] : undefined}
            dispatch={dispatch}
          />
        </View>
      );
    },
    [isOngoing, programDay, prs, props.settings, dispatch, socialReactions, socialOwners, userId]
  );

  const keyExtractor = useCallback((item: IFeedRow) => FeedMerge_rowKey(item), []);

  const scrollMarkers = usePerfScrollMarkers("ProgramHistoryView");

  const stickyHeader = (
    <View>
      <View className="flex-row items-center border-b border-border-neutral">
        <View className="flex-1">
          <WeekCalendar
            startWeekFromMonday={props.settings.startWeekFromMonday}
            selectedWeekCalendarFirstDayOfWeek={selectedWeekCalendarFirstDayOfWeek}
            history={sortedHistory}
            firstDayOfWeekToHistoryRecord={firstDayOfWeekToHistoryRecord}
            firstDayOfWeeks={firstDayOfWeeks}
            isLoading={isLoading}
            selectedFirstDayOfWeek={selectedFirstDayOfWeek}
            onClick={() => navigateToModal("monthCalendarModal")}
            onSelectFirstDayOfWeek={(firstDayOfWeek) => {
              setSelectedWeekCalendarFirstDayOfWeek(firstDayOfWeek);
            }}
          />
        </View>
        {hasFollowing && (
          <Pressable
            testID="feed-filter-button"
            data-testid="feed-filter-button"
            className="items-center justify-center mr-3 rounded-lg bg-background-cardpurple"
            style={{ width: 36, height: 36 }}
            onPress={() => dispatch(Thunk_pushScreen("feedFilter"))}
          >
            <IconFilter size={18} />
          </Pressable>
        )}
      </View>
      <WeekInsights
        dispatch={props.dispatch}
        prs={prs}
        selectedFirstDayOfWeek={selectedFirstDayOfWeek}
        thisWeekHistory={thisWeekHistory}
        lastWeekHistory={lastWeekHistory}
        settings={props.settings}
        subscription={props.subscription}
      />
    </View>
  );

  if (rows.length === 0) {
    return (
      <View className="flex-1">
        {stickyHeader}
        <HistoryRecordsNullState />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {stickyHeader}
      <LegendList
        key={listRemountKey}
        ref={flatListRef}
        data={rows}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={300}
        onEndReached={() => {
          if (hasFollowing) {
            dispatch(Thunk_loadFeed(SocialState_homePage, false));
          }
        }}
        initialScrollIndex={initialScrollIndex}
        waitForInitialLayout={true}
        onViewableItemsChanged={onViewableItemsChanged}
        onScrollBeginDrag={scrollMarkers.onScrollBeginDrag}
        onScrollEndDrag={scrollMarkers.onScrollEndDrag}
        onMomentumScrollEnd={scrollMarkers.onMomentumScrollEnd}
      />
    </View>
  );
}
