import { JSX } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { useNavOptions } from "../navigation/useNavOptions";
import { Thunk_undoImport } from "../ducks/thunks";
import { IImportSession } from "../types";
import { DateUtils_format } from "../utils/date";
import { StringUtils_pluralize } from "../utils/string";
import { LinkButton } from "./linkButton";

interface IProps {
  dispatch: IDispatch;
  importSessions?: IImportSession[];
}

export function ScreenRecentImports(props: IProps): JSX.Element {
  useNavOptions({ navTitle: "Recent Imports" });
  const importSessions = [...(props.importSessions ?? [])].reverse();

  return (
    <View className="px-4">
      {importSessions.length === 0 ? (
        <Text className="py-8 text-center text-text-secondary">No recent imports</Text>
      ) : (
        importSessions.map((session) => (
          <View key={session.id} className="flex-row items-center py-3 border-b border-border-neutral">
            <View className="flex-1">
              <Text className="text-base text-text-primary">
                {session.source === "hevy" ? "Hevy" : "CSV"} · {DateUtils_format(session.timestamp)}
              </Text>
              <Text className="text-sm text-text-secondary">
                {session.workoutCount} {StringUtils_pluralize("workout", session.workoutCount)}
                {session.customExerciseIds.length > 0
                  ? `, ${session.customExerciseIds.length} new ${StringUtils_pluralize(
                      "exercise",
                      session.customExerciseIds.length
                    )}`
                  : ""}
              </Text>
            </View>
            <LinkButton name={`undo-import-${session.id}`} onClick={() => props.dispatch(Thunk_undoImport(session.id))}>
              Undo
            </LinkButton>
          </View>
        ))
      )}
    </View>
  );
}
