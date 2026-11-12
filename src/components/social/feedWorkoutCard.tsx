import { JSX, memo } from "react";
import { Image, Pressable, View } from "react-native";
import { Text } from "../primitives/text";
import { IFeedExercise, IFeedWorkout } from "../../models/feedWorkout";
import { IReaction, IReactionSummary } from "../../models/reactions";
import { ISettings } from "../../types";
import { ExerciseImage } from "../exerciseImage";
import { HistoryRecordSetsView } from "../historyRecordSets";
import { HistoryRecordStatsRow, getNativeCardShadow } from "../historyRecord";
import { IconDefaultExercise } from "../icons/iconDefaultExercise";
import { HostConfig_resolveUrl } from "../../utils/hostConfig";
import { Avatar } from "./avatar";
import { ReactionBar } from "./reactionBar";
import { RelativeTime_ago } from "../../utils/relativeTime";
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
        <Text className="text-xs text-text-secondary">{props.subtitle}</Text>
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

function FeedExerciseRow(props: { exercise: IFeedExercise; settings: ISettings; showNotes: boolean }): JSX.Element {
  const { exercise } = props;
  return (
    <View testID="feed-workout-exercise" data-testid="feed-workout-exercise" className="flex-row items-center gap-2">
      <View className="items-center justify-center py-1 rounded-lg bg-background-image" style={{ minWidth: 36 }}>
        <FeedExerciseImage exercise={exercise} settings={props.settings} />
      </View>
      <View className="flex-row items-center flex-1 py-2 border-b min-h-scaled-16 border-border-neutral">
        <View className="flex-1 shrink" style={{ minWidth: "45%" }}>
          <Text className="text-sm font-semibold">{exercise.name}</Text>
          {props.showNotes && exercise.notes ? (
            <Text className="mt-1 text-sm text-text-secondary">{exercise.notes}</Text>
          ) : null}
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
  now: number;
  maxExercises?: number;
  showIdentity: boolean;
  onOpen?: () => void;
  onOpenOwner?: () => void;
  onReact: (reaction: IReaction | undefined) => void;
}

export const FeedWorkoutCard = memo(function FeedWorkoutCard(props: IFeedWorkoutCardProps): JSX.Element {
  const { workout } = props;
  const exercises = props.maxExercises != null ? workout.exercises.slice(0, props.maxExercises) : workout.exercises;
  const hidden = workout.exercises.length - exercises.length;
  const trainedAt = workout.endTime ?? workout.startTime;
  return (
    <View testID="feed-workout" data-testid="feed-workout">
      <Pressable
        className="px-4 py-4 border rounded-2xl bg-background-cardpurple border-border-cardpurple"
        style={getNativeCardShadow()}
        onPress={props.onOpen}
        disabled={props.onOpen == null}
      >
        {props.showIdentity && (
          <View className="pb-3 mb-3 border-b border-border-cardpurple">
            <FeedIdentity
              ownerId={workout.ownerId}
              nickname={props.nickname}
              subtitle={`Trained ${RelativeTime_ago(trainedAt, props.now)} · ${DateUtils_format(workout.date, false, true)}`}
              onPress={props.onOpenOwner}
            />
          </View>
        )}
        <View className="pb-2">
          <Text className="text-sm font-semibold">{workout.dayName}</Text>
          <Text className="text-xs text-text-secondary">{workout.programName}</Text>
        </View>
        {exercises.map((exercise, i) => (
          <FeedExerciseRow
            key={i}
            exercise={exercise}
            settings={props.settings}
            showNotes={props.maxExercises == null}
          />
        ))}
        {hidden > 0 && (
          <Text className="pt-2 text-xs text-text-secondary">
            +{hidden} more {hidden === 1 ? "exercise" : "exercises"}
          </Text>
        )}
        <HistoryRecordStatsRow
          durationMs={workout.stats.durationMs}
          volume={workout.stats.volume}
          sets={workout.stats.sets}
          reps={workout.stats.reps}
        />
        {props.maxExercises == null && workout.notes ? (
          <View className="mt-2">
            <Text className="text-sm text-text-secondary">{workout.notes}</Text>
          </View>
        ) : null}
        <View className="pt-3 mt-3 border-t border-border-cardpurple">
          <ReactionBar
            summary={props.reactions}
            canReact={true}
            onReact={props.onReact}
            testIdPrefix={`reaction-${workout.ownerId}-${workout.recordId}`}
          />
        </View>
      </Pressable>
    </View>
  );
});
