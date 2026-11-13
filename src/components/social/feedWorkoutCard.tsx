import { JSX, memo } from "react";
import { Image, Pressable, View } from "react-native";
import { Text } from "../primitives/text";
import { IFeedExercise, IFeedWorkout } from "../../models/feedWorkout";
import { IReaction, IReactionSummary, Reactions_reactorsLine } from "../../models/reactions";
import { ISettings } from "../../types";
import { ExerciseImage } from "../exerciseImage";
import { HistoryRecordSetsView } from "../historyRecordSets";
import { HistoryRecordStatsRow, getNativeCardShadow } from "../historyRecord";
import { IconDefaultExercise } from "../icons/iconDefaultExercise";
import { HostConfig_resolveUrl } from "../../utils/hostConfig";
import { Avatar } from "./avatar";
import { ReactionBar } from "./reactionBar";
import { DateUtils_format } from "../../utils/date";

interface IFeedIdentityProps {
  ownerId: string;
  nickname?: string;
  subtitle: string;
  onPress?: () => void;
}

export function FeedIdentity(props: IFeedIdentityProps): JSX.Element {
  return (
    <Pressable className="flex-row items-center gap-3" onPress={props.onPress} disabled={props.onPress == null}>
      <Avatar seed={props.ownerId} nickname={props.nickname} size={40} />
      <View className="flex-1">
        <Text className="text-base font-semibold" numberOfLines={1}>
          {props.nickname || props.ownerId}
        </Text>
        <Text className="text-xs text-text-secondary" numberOfLines={1}>
          {props.subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

function FeedExerciseImage(props: { exercise: IFeedExercise; settings: ISettings }): JSX.Element {
  if (props.exercise.exerciseType != null) {
    return (
      <ExerciseImage
        settings={props.settings}
        className="w-scaled-8"
        exerciseType={props.exercise.exerciseType}
        size="small"
      />
    );
  }
  if (props.exercise.imageUrl != null) {
    return <Image source={{ uri: HostConfig_resolveUrl(props.exercise.imageUrl) }} style={{ width: 32, height: 32 }} />;
  }
  return <IconDefaultExercise />;
}

function FeedExerciseRow(props: { exercise: IFeedExercise; settings: ISettings }): JSX.Element {
  const { exercise } = props;
  return (
    <View testID="feed-workout-exercise" data-testid="feed-workout-exercise" className="flex-row items-center gap-2">
      <View className="items-center justify-center py-1 rounded-lg bg-background-image" style={{ minWidth: 36 }}>
        <FeedExerciseImage exercise={exercise} settings={props.settings} />
      </View>
      <View className="flex-row items-center flex-1 py-2 border-b min-h-scaled-16 border-border-neutral">
        <View className="flex-1 shrink" style={{ minWidth: "45%" }}>
          <Text className="text-sm font-semibold">{exercise.name}</Text>
          {exercise.notes ? <Text className="mt-1 text-sm text-text-secondary">{exercise.notes}</Text> : null}
        </View>
        <View className="shrink">
          <HistoryRecordSetsView sets={exercise.sets} units={props.settings.units} isNext={false} />
        </View>
      </View>
    </View>
  );
}

interface IFeedWorkoutCardProps {
  workout: IFeedWorkout;
  nickname?: string;
  reactions?: IReactionSummary;
  settings: ISettings;
  showIdentity: boolean;
  showDate: boolean;
  onOpenOwner?: () => void;
  onReact: (reaction: IReaction | undefined) => void;
}

export const FeedWorkoutCard = memo(function FeedWorkoutCard(props: IFeedWorkoutCardProps): JSX.Element {
  const { workout } = props;
  return (
    <View testID="feed-workout" data-testid="feed-workout" className="pt-2">
      {props.showDate && (
        <Text testID="feed-workout-date" data-testid="feed-workout-date" className="mx-1 mb-1 text-base font-semibold">
          {DateUtils_format(workout.date)}
        </Text>
      )}
      <View
        className="px-4 py-4 border rounded-2xl bg-background-cardyellow border-border-cardyellow"
        style={getNativeCardShadow()}
      >
        {props.showIdentity ? (
          <View className="pb-3 mb-1 border-b border-border-cardyellow">
            <FeedIdentity
              ownerId={workout.ownerId}
              nickname={props.nickname}
              subtitle={`${workout.programName} · ${workout.dayName}`}
              onPress={props.onOpenOwner}
            />
          </View>
        ) : (
          <View className="pb-2">
            <Text className="text-sm font-semibold">{workout.dayName}</Text>
            <Text className="text-xs text-text-secondary">{workout.programName}</Text>
          </View>
        )}
        {workout.exercises.map((exercise, i) => (
          <FeedExerciseRow key={i} exercise={exercise} settings={props.settings} />
        ))}
        <HistoryRecordStatsRow
          durationMs={workout.stats.durationMs}
          volume={workout.stats.volume}
          sets={workout.stats.sets}
          reps={workout.stats.reps}
        />
        {workout.notes ? (
          <View className="mt-2">
            <Text className="text-sm text-text-secondary">{workout.notes}</Text>
          </View>
        ) : null}
        <View className="pt-3 mt-3 border-t border-border-cardyellow">
          <ReactionBar
            summary={props.reactions}
            canReact={true}
            tone="yellow"
            onReact={props.onReact}
            testIdPrefix={`reaction-${workout.ownerId}-${workout.recordId}`}
          />
          {props.reactions != null && props.reactions.total > 0 && (
            <Text className="mt-2 text-xs text-text-secondary">{Reactions_reactorsLine(props.reactions)}</Text>
          )}
        </View>
      </View>
    </View>
  );
});
