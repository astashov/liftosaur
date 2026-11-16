import { JSX, useCallback, useEffect, useMemo } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { useNavOptions } from "../../navigation/useNavOptions";
import { IDispatch } from "../../ducks/types";
import { ISocialState, SocialState_programEditsKey } from "../../models/socialState";
import { FriendLoadError } from "./friendLoadError";
import { IProgramEdit } from "../../models/friendProgram";
import { Thunk_loadProgramEditsFor } from "../../ducks/socialThunks";
import { LineDiff_diff, LineDiff_rows, LineDiff_withInline } from "../../utils/lineDiff";
import { RelativeTime_ago } from "../../utils/relativeTime";
import { Avatar } from "./avatar";
import { IconSpinner } from "../icons/iconSpinner";
import { Follow_displayName } from "../../models/follow";

interface IProps {
  programId: string;
  programName?: string;
  social?: ISocialState;
  dispatch: IDispatch;
}

const diffContext = 2;

const rowClassName = {
  add: "px-2 font-mono text-xs bg-background-success",
  remove: "px-2 font-mono text-xs bg-background-lighterror",
  same: "px-2 font-mono text-xs",
};

const rowPrefix = { add: "+ ", remove: "- ", same: "  " };

const changedSpanClassName = {
  add: "font-mono text-xs bg-background-successstrong",
  remove: "font-mono text-xs bg-background-errorstrong",
  same: "font-mono text-xs",
};

function EditDiff(props: { edit: IProgramEdit }): JSX.Element {
  const { before, after } = props.edit;
  const rows = useMemo(
    () =>
      before != null && after != null
        ? LineDiff_rows(LineDiff_withInline(LineDiff_diff(before, after)), diffContext)
        : undefined,
    [before, after]
  );
  if (rows == null) {
    return <Text className="text-sm text-text-secondary">The change for this edit is no longer stored.</Text>;
  }
  if (rows.every((row) => row.kind === "skip" || row.kind === "same")) {
    return <Text className="text-sm text-text-secondary">No changes to the program text.</Text>;
  }
  return (
    <View className="overflow-hidden border rounded-lg border-border-neutral">
      {rows.map((row, i) =>
        row.kind === "skip" ? (
          <Text key={i} className="px-2 py-1 text-xs text-text-secondary bg-background-subtle">
            ⋯ {row.count} unchanged
          </Text>
        ) : (
          <Text key={i} className={rowClassName[row.kind]}>
            {rowPrefix[row.kind]}
            {row.spans == null
              ? row.text
              : row.spans.map((span, j) =>
                  span.isChanged ? (
                    <Text key={j} className={changedSpanClassName[row.kind]}>
                      {span.text}
                    </Text>
                  ) : (
                    span.text
                  )
                )}
          </Text>
        )
      )}
    </View>
  );
}

export function ScreenProgramEdits(props: IProps): JSX.Element {
  useNavOptions({ navTitle: "Changes by friends", navSubtitle: props.programName });
  const edits = props.social?.programEditsByProgram[props.programId];
  const error = props.social?.friendErrors[SocialState_programEditsKey(props.programId)];
  const load = useCallback(() => {
    props.dispatch(Thunk_loadProgramEditsFor(props.programId));
  }, [props.programId]);

  useEffect(load, [load]);

  if (edits == null && error != null) {
    return <FriendLoadError message={error} onRetry={load} />;
  }
  if (edits == null) {
    return (
      <View className="items-center py-8">
        <IconSpinner width={24} height={24} />
      </View>
    );
  }
  if (edits.length === 0) {
    return <Text className="py-8 text-center text-text-secondary">No friend has edited this program.</Text>;
  }
  const now = Date.now();
  return (
    <View className="px-4 pb-8">
      {edits.map((edit) => (
        <View key={edit.id} className="py-4 border-b border-border-neutral">
          <View className="flex-row items-center gap-2 mb-2">
            <Avatar nickname={edit.nickname} size={28} />
            <Text className={`flex-1 ${edit.seen ? "" : "font-semibold"}`}>
              {Follow_displayName(edit.nickname)} · {RelativeTime_ago(edit.createdAt, now)}
            </Text>
          </View>
          <EditDiff edit={edit} />
        </View>
      ))}
    </View>
  );
}
