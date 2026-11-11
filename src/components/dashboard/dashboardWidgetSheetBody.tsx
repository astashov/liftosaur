import { JSX, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SystemKeyboardSpacer } from "../systemKeyboardSpacer";
import { Text } from "../primitives/text";
import { DashboardWidget } from "./dashboardView";
import { DashboardWidgetForm } from "./dashboardWidgetForm";
import { DashboardWidgetTextEditor } from "./dashboardWidgetTextEditor";
import { ScrollableTabs } from "../scrollableTabs";
import { DashboardEditTiles_label } from "./dashboardEditTiles";
import { DashboardFormChevron } from "./dashboardFormParts";
import { IExercisePickerSelectedExercise, IExerciseType, IHistoryRecord, ISettings } from "../../types";
import { ILiftographSeriesEval, LiftographSeriesEval_compile } from "../../liftograph/liftographSeriesEval";
import { LiftographRail_pickedExercise } from "../../liftograph/liftographRail";
import { LiftographEditorAnalysis } from "../../liftograph/liftographEditorAnalysis";
import {
  LiftographCompletions_labelsByExercise,
  LiftographCompletions_programNames,
} from "../../liftograph/liftographCompletions";
import { LiftographWidgetModel_read } from "../../liftograph/liftographWidgetModel";
import { LiftographWidgetEdit_pickExercise } from "../../liftograph/liftographWidgetEdit";
import { DashboardWidgetFields_pickerExercise } from "../../models/dashboardWidgetFields";
import {
  DashboardWidgetCommit_result,
  IDashboardWidgetModalData,
  IDashboardWidgetModalResult,
} from "../../models/dashboardWidgetCommit";
import {
  DashboardWidgetSheet_init,
  DashboardWidgetSheet_isPreviewCollapsible,
  DashboardWidgetSheet_isPreviewPinned,
  DashboardWidgetSheet_setModel,
  DashboardWidgetSheet_setText,
  DashboardWidgetSheet_toForm,
  DashboardWidgetSheet_toText,
  DashboardWidgetSheet_written,
  IDashboardWidgetSheetMode,
  IDashboardWidgetSheetState,
} from "../../models/dashboardWidgetSheet";
import { Dialog_confirm } from "../../utils/dialog";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

const DISCARD_MESSAGE = "Discard changes to this widget?";
const SHEET_MODES: IDashboardWidgetSheetMode[] = ["form", "text"];

export interface IDashboardWidgetSheetBodyProps {
  data: IDashboardWidgetModalData;
  settings: ISettings;
  history: IHistoryRecord[];
  evaluation: ILiftographSeriesEval;
  onClose: () => void;
  onDone: (result: IDashboardWidgetModalResult) => void;
  pickExercise: (exerciseType: IExerciseType | undefined) => Promise<IExercisePickerSelectedExercise | undefined>;
  frame: (content: ReactNode, shouldClose: () => Promise<boolean>) => JSX.Element;
}

export function DashboardWidgetSheetBody(props: IDashboardWidgetSheetBodyProps): JSX.Element {
  const { data, settings, history, evaluation } = props;
  const [sheet, setSheet] = useState<IDashboardWidgetSheetState | undefined>(() => {
    const model = LiftographWidgetModel_read(data.snippet);
    return model != null ? DashboardWidgetSheet_init(model, data.mode ?? "form", data.anchor.format) : undefined;
  });
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [analysis] = useState(() => new LiftographEditorAnalysis(settings));
  const isPreviewPinned = sheet != null && DashboardWidgetSheet_isPreviewPinned(sheet.model.kind);
  const scrollRef = useRef<ScrollView>(null);
  const isTouched = sheet?.isTouched ?? false;
  const format = data.anchor.format;
  const formOptions = useMemo(
    () => ({
      settings,
      programNames: LiftographCompletions_programNames(history),
      labelsByExercise: LiftographCompletions_labelsByExercise(history),
    }),
    [settings, history]
  );

  analysis.setSettings(settings);
  useEffect(() => analysis.setHistory(history), [history]);

  const written = useMemo(() => (sheet != null ? DashboardWidgetSheet_written(sheet, format) : ""), [sheet, format]);
  const preview = useMemo(
    () => LiftographSeriesEval_compile(evaluation, written).layout[0]?.items[0],
    [evaluation, written]
  );
  const diagnostics = useMemo(
    () => (sheet?.mode === "text" ? analysis.compileDiagnostics(written) : []),
    [sheet?.mode, written, settings]
  );

  const isUnreadable = sheet == null;
  useEffect(() => {
    if (isUnreadable) {
      props.onClose();
    }
  }, [isUnreadable]);
  if (sheet == null) {
    return <></>;
  }

  const pickExercise = async (entryIndex: number): Promise<void> => {
    const selected = await props.pickExercise(
      DashboardWidgetFields_pickerExercise(sheet.model, entryIndex, settings.exercises)
    );
    const picked = selected != null ? LiftographRail_pickedExercise(selected, settings) : undefined;
    if (picked == null) {
      return;
    }
    setSheet((current) =>
      current != null
        ? DashboardWidgetSheet_setModel(
            current,
            LiftographWidgetEdit_pickExercise(current.model, entryIndex, picked.name, picked.equipment)
          )
        : current
    );
  };
  const shouldClose = async (): Promise<boolean> => !isTouched || Dialog_confirm(DISCARD_MESSAGE);
  const cancel = async (): Promise<void> => {
    if (await shouldClose()) {
      props.onClose();
    }
  };
  const setMode = (mode: IDashboardWidgetSheetMode): void => {
    setSheet(mode === "text" ? DashboardWidgetSheet_toText(sheet, format) : DashboardWidgetSheet_toForm(sheet));
  };

  const isPreviewCollapsible = DashboardWidgetSheet_isPreviewCollapsible(sheet.model.kind);
  const previewBody =
    preview == null ? null : preview.kind === "error" || preview.kind === "unsupported" ? (
      <Text className="text-sm text-text-error" style={{ flexShrink: 1 }}>
        {preview.message}
      </Text>
    ) : (
      <DashboardWidget id="widget-preview" widget={preview} evaluation={evaluation} isCompact={true} />
    );
  const previewView = (
    <View
      className="border-b border-border-neutral"
      style={{ backgroundColor: Tailwind_semantic().background.default, zIndex: 1 }}
    >
      {isPreviewCollapsible ? (
        <Pressable
          testID="dashboard-widget-preview-toggle"
          data-testid="dashboard-widget-preview-toggle"
          className="flex-row items-center justify-between px-4 py-2"
          onPress={() => setIsPreviewOpen(!isPreviewOpen)}
        >
          <Text className="text-sm text-text-link">{isPreviewOpen ? "Hide preview" : "Show preview"}</Text>
          <View style={{ transform: [{ rotate: isPreviewOpen ? "-90deg" : "90deg" }] }}>
            <DashboardFormChevron direction="forward" color={Tailwind_semantic().text.link} />
          </View>
        </Pressable>
      ) : null}
      {!isPreviewCollapsible || isPreviewOpen ? (
        <View
          testID="dashboard-widget-preview"
          className="flex-row px-4 pb-2"
          style={isPreviewCollapsible ? undefined : { paddingTop: 8 }}
          pointerEvents="none"
        >
          {previewBody}
        </View>
      ) : null}
    </View>
  );

  return props.frame(
    <>
      <View className="flex-row items-center px-4 pb-2">
        <Pressable
          testID="dashboard-widget-cancel"
          data-testid="dashboard-widget-cancel"
          className="py-2 pr-4"
          onPress={cancel}
        >
          <Text className="text-base text-text-link">Cancel</Text>
        </Pressable>
        <Text className="flex-1 text-lg font-semibold text-center">{DashboardEditTiles_label(sheet.model.kind)}</Text>
        <Pressable
          testID="dashboard-widget-done"
          data-testid="dashboard-widget-done"
          className="py-2 pl-4"
          onPress={() => props.onDone(DashboardWidgetCommit_result(data.anchor, isTouched, written))}
        >
          <Text className="text-base font-semibold text-text-purple">Done</Text>
        </Pressable>
      </View>
      <ScrollableTabs
        topPadding="0"
        nonSticky={true}
        fillHeight={true}
        selectedIndex={SHEET_MODES.indexOf(sheet.mode)}
        onChange={(index) => setMode(SHEET_MODES[index])}
        tabs={[
          {
            label: "Form",
            children: () => (
              <View style={{ flex: 1 }}>
                <ScrollView
                  ref={scrollRef}
                  keyboardShouldPersistTaps="handled"
                  stickyHeaderIndices={isPreviewPinned ? [0] : undefined}
                  contentContainerStyle={{ paddingBottom: 32 }}
                >
                  {previewView}
                  <View className="px-4">
                    <DashboardWidgetForm
                      model={sheet.model}
                      options={formOptions}
                      onChange={(model) => setSheet(DashboardWidgetSheet_setModel(sheet, model))}
                      onPickExercise={pickExercise}
                      onEditAsText={() => setMode("text")}
                      onNavigate={() => scrollRef.current?.scrollTo({ y: 0, animated: false })}
                    />
                  </View>
                  <SystemKeyboardSpacer scrollRef={scrollRef} />
                </ScrollView>
              </View>
            ),
          },
          {
            label: "Text",
            children: () => (
              <DashboardWidgetTextEditor
                header={previewView}
                isHeaderPinned={isPreviewPinned}
                text={sheet.text}
                analysis={analysis}
                diagnostics={diagnostics}
                notice={sheet.formError}
                onChange={(text) =>
                  setSheet((current) => (current != null ? DashboardWidgetSheet_setText(current, text) : current))
                }
              />
            ),
          },
        ]}
      />
    </>,
    shouldClose
  );
}
