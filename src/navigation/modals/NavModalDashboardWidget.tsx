import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SystemKeyboardSpacer } from "../../components/systemKeyboardSpacer";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { TransparentModal } from "../TransparentModal";
import { Modal_clear, Modal_setResult, useModal, useModalData, useModalDispatch } from "../ModalStateContext";
import { Text } from "../../components/primitives/text";
import { DashboardWidget } from "../../components/dashboard/dashboardView";
import { DashboardWidgetForm } from "../../components/dashboard/dashboardWidgetForm";
import { DashboardWidgetTextEditor } from "../../components/dashboard/dashboardWidgetTextEditor";
import { ScrollableTabs } from "../../components/scrollableTabs";
import { useDashboardEvaluation } from "../../components/screenDashboard";
import { LiftographSeriesEval_compile } from "../../liftograph/liftographSeriesEval";
import { LiftographRail_pickedExercise } from "../../liftograph/liftographRail";
import { LiftographEditorAnalysis } from "../../liftograph/liftographEditorAnalysis";
import {
  LiftographCompletions_labelsByExercise,
  LiftographCompletions_programNames,
} from "../../liftograph/liftographCompletions";
import { LiftographWidgetModel_read } from "../../liftograph/liftographWidgetModel";
import { LiftographWidgetEdit_pickExercise } from "../../liftograph/liftographWidgetEdit";
import { DashboardWidgetFields_pickerExercise } from "../../models/dashboardWidgetFields";
import { DashboardWidgetCommit_result } from "../../models/dashboardWidgetCommit";
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
import { DashboardEditTiles_label } from "../../components/dashboard/dashboardEditTiles";
import { DashboardFormChevron } from "../../components/dashboard/dashboardFormParts";
import { Dialog_confirm } from "../../utils/dialog";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

const DISCARD_MESSAGE = "Discard changes to this widget?";
const SHEET_MODES: IDashboardWidgetSheetMode[] = ["form", "text"];

export function NavModalDashboardWidget(): JSX.Element {
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const data = useModalData("dashboardWidgetModal");
  const { state } = useAppState();
  const { settings, stats, history } = state.storage;
  const evaluation = useDashboardEvaluation({ history, stats, settings });
  const [sheet, setSheet] = useState<IDashboardWidgetSheetState | undefined>(() => {
    const model = data != null ? LiftographWidgetModel_read(data.snippet) : undefined;
    return model != null && data != null
      ? DashboardWidgetSheet_init(model, data.mode ?? "form", data.anchor.format)
      : undefined;
  });
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [analysis] = useState(() => new LiftographEditorAnalysis(settings));
  const isPreviewPinned = sheet != null && DashboardWidgetSheet_isPreviewPinned(sheet.model.kind);
  const pickEntryRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const isTouched = sheet?.isTouched ?? false;
  const format = data?.anchor.format;
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

  const written = useMemo(
    () => (sheet != null && format != null ? DashboardWidgetSheet_written(sheet, format) : ""),
    [sheet, format]
  );
  const preview = useMemo(
    () => LiftographSeriesEval_compile(evaluation, written).layout[0]?.items[0],
    [evaluation, written]
  );
  const diagnostics = useMemo(
    () => (sheet?.mode === "text" ? analysis.compileDiagnostics(written) : []),
    [sheet?.mode, written, settings]
  );

  const openPicker = useModal("liftoEditorExercisePickerModal", (selected) => {
    const picked = LiftographRail_pickedExercise(selected, settings);
    if (picked == null) {
      return;
    }
    const entryIndex = pickEntryRef.current;
    setSheet((current) =>
      current != null
        ? DashboardWidgetSheet_setModel(
            current,
            LiftographWidgetEdit_pickExercise(current.model, entryIndex, picked.name, picked.equipment)
          )
        : current
    );
  });

  const close = (): void => {
    Modal_clear(modalDispatch, "dashboardWidgetModal");
    navigation.goBack();
  };
  const finish = (): void => {
    if (data != null) {
      Modal_setResult(
        modalDispatch,
        "dashboardWidgetModal",
        DashboardWidgetCommit_result(data.anchor, isTouched, written)
      );
    }
    navigation.goBack();
  };
  const shouldClose = async (): Promise<boolean> => !isTouched || Dialog_confirm(DISCARD_MESSAGE);
  const cancel = async (): Promise<void> => {
    if (await shouldClose()) {
      close();
    }
  };
  const setMode = (mode: IDashboardWidgetSheetMode): void => {
    if (sheet == null || format == null) {
      return;
    }
    setSheet(mode === "text" ? DashboardWidgetSheet_toText(sheet, format) : DashboardWidgetSheet_toForm(sheet));
  };

  const shouldGoBack = data == null || sheet == null;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);
  if (data == null || sheet == null) {
    return <></>;
  }

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

  return (
    <SheetScreenContainer onClose={close} shouldClose={shouldClose}>
      <TransparentModal onClose={close} shouldClose={shouldClose}>
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
            onPress={finish}
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
                        onPickExercise={(entryIndex) => {
                          pickEntryRef.current = entryIndex;
                          openPicker({
                            exerciseType: DashboardWidgetFields_pickerExercise(
                              sheet.model,
                              entryIndex,
                              settings.exercises
                            ),
                          });
                        }}
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
      </TransparentModal>
    </SheetScreenContainer>
  );
}
