import { JSX, useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { LegendList } from "@legendapp/list";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { useNavOptions } from "../navigation/useNavOptions";
import { Thunk_applyImport, Thunk_pushScreen } from "../ducks/thunks";
import { Dialog_alert } from "../utils/dialog";
import { IHistoryRecord, ISettings } from "../types";
import { IImportPreview, IState, updateState } from "../models/state";
import { lb } from "lens-shmens";
import { IImportRowError, ImportUtils_customExercisesForRecords, ImportUtils_summarize } from "../utils/importTypes";
import { HistoryRecordView } from "./historyRecord";
import { LinkButton } from "./linkButton";
import { DateUtils_format } from "../utils/date";
import { StringUtils_pluralize } from "../utils/string";
import { CollectionUtils_sortBy } from "../utils/collection";
import { Button } from "./button";

interface IProps {
  dispatch: IDispatch;
  preview: IImportPreview;
  history: IHistoryRecord[];
  settings: ISettings;
}

function ExpandableSection(props: { title: string; items: string[] }): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <View className="pt-1">
      <Text className="text-sm text-text-secondary">
        ⚠ {props.title}{" "}
        <LinkButton className="text-sm" onPress={() => setIsExpanded(!isExpanded)} name="expand-section-import-preview">
          {isExpanded ? "Hide" : "Show"}
        </LinkButton>
      </Text>
      {isExpanded && (
        <View className="pl-4">
          {props.items.map((item, i) => (
            <Text key={i} className="text-xs text-text-secondary">
              {item}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function formatRowError(error: IImportRowError): string {
  return `Row ${error.row}: ${error.message}`;
}

export function ScreenImportPreview(props: IProps): JSX.Element {
  const { result, source } = props.preview;
  // Duplicate detection runs over ALL parsed records (against existing history).
  const summary = useMemo(() => ImportUtils_summarize(result, props.history), [result, props.history]);
  // The created custom exercises aren't in settings until the import is applied, so merge them in
  // for rendering - otherwise their cards fall back to a wrong builtin exercise. Existing exercises
  // win over imported ones (matching apply behavior: a locally-renamed exercise keeps its name).
  const previewSettings = useMemo(
    () => ({ ...props.settings, exercises: { ...result.customExercises, ...props.settings.exercises } }),
    [props.settings, result.customExercises]
  );
  const [shouldSkipDuplicates, setShouldSkipDuplicates] = useState(true);
  const sortedRecords = useMemo(
    () => CollectionUtils_sortBy(result.historyRecords, "startTime", true),
    [result.historyRecords]
  );
  const recordsToImport = useMemo(
    () =>
      shouldSkipDuplicates && summary.duplicateIds.size > 0
        ? result.historyRecords.filter((r) => !summary.duplicateIds.has(r.id))
        : result.historyRecords,
    [shouldSkipDuplicates, summary.duplicateIds, result.historyRecords]
  );
  // Counts/date-range/custom-exercise list reflect what will ACTUALLY be imported (duplicates are
  // skipped by default), not every parsed record.
  const importSummary = useMemo(
    () =>
      ImportUtils_summarize(
        {
          ...result,
          historyRecords: recordsToImport,
          customExercises: ImportUtils_customExercisesForRecords(recordsToImport, result.customExercises),
        },
        props.history
      ),
    [result, recordsToImport, props.history]
  );

  const onImport = (): void => {
    const count = recordsToImport.length;
    const customExercises = ImportUtils_customExercisesForRecords(recordsToImport, result.customExercises);
    props.dispatch(Thunk_applyImport(recordsToImport, customExercises, source));
    updateState(props.dispatch, [lb<IState>().p("importPreview").record(undefined)], "Close import preview");
    props.dispatch(Thunk_pushScreen("main", undefined, { tab: "home" }));
    Dialog_alert(`Successfully imported ${count} ${StringUtils_pluralize("workout", count)}.`);
  };

  useNavOptions({
    navTitle: "Import Preview",
    navRightButtons: [
      <Button
        kind="purple"
        buttonSize="md"
        key="import"
        name="import-preview-confirm"
        disabled={recordsToImport.length === 0}
        onClick={onImport}
      >
        Import
      </Button>,
    ],
  });

  return (
    <View className="flex-1">
      <LegendList
        data={sortedRecords}
        keyExtractor={(record) => `${record.id}`}
        estimatedItemSize={300}
        style={{ flex: 1 }}
        renderItem={({ item }) => (
          <View className="px-4 mb-6" pointerEvents="none">
            <HistoryRecordView
              historyRecord={item}
              showTitle={true}
              isOngoing={false}
              settings={previewSettings}
              dispatch={props.dispatch}
            />
          </View>
        )}
        ListHeaderComponent={
          <View className="px-4 pb-4">
            <Text className="text-base font-semibold">
              Import {importSummary.workoutCount} {StringUtils_pluralize("workout", importSummary.workoutCount)}
            </Text>
            {importSummary.minStartTime != null && importSummary.maxStartTime != null && (
              <Text className="text-sm text-text-secondary">
                {DateUtils_format(importSummary.minStartTime)} - {DateUtils_format(importSummary.maxStartTime)}
              </Text>
            )}
            {importSummary.customExerciseNames.length > 0 && (
              <ExpandableSection
                title={`${importSummary.customExerciseNames.length} ${StringUtils_pluralize(
                  "exercise",
                  importSummary.customExerciseNames.length
                )} will be created as custom`}
                items={importSummary.customExerciseNames}
              />
            )}
            {result.errors.length > 0 && (
              <ExpandableSection
                title={`${result.errors.length} ${StringUtils_pluralize(
                  "row",
                  result.errors.length
                )} skipped because they couldn't be parsed`}
                items={result.errors.map(formatRowError)}
              />
            )}
            {result.warnings.length > 0 && (
              <ExpandableSection
                title={`${result.warnings.length} ${
                  result.warnings.length === 1 ? "value looks" : "values look"
                } suspicious`}
                items={result.warnings.map(formatRowError)}
              />
            )}
            {summary.duplicateIds.size > 0 && (
              <View className="pt-1">
                <Pressable>
                  <Text className="text-sm text-text-secondary">
                    ⚠ {summary.duplicateIds.size} {summary.duplicateIds.size === 1 ? "workout looks" : "workouts look"}{" "}
                    like duplicates of existing history{" "}
                    <LinkButton
                      name="toggle-duplicate-import-preview"
                      className="text-sm"
                      onPress={() => setShouldSkipDuplicates(!shouldSkipDuplicates)}
                    >
                      {shouldSkipDuplicates ? "Skipped - Include?" : "Included - Skip?"}
                    </LinkButton>
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        }
      />
    </View>
  );
}
