import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
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
import {
  LiftographWidgetModel_pickExercise,
  LiftographWidgetModel_pickerExercise,
  LiftographWidgetModel_read,
} from "../../liftograph/liftographWidgetModel";
import { DashboardWidgetCommit_result } from "../../models/dashboardWidgetCommit";
import {
  DashboardWidgetSheet_init,
  DashboardWidgetSheet_setModel,
  DashboardWidgetSheet_setText,
  DashboardWidgetSheet_toForm,
  DashboardWidgetSheet_toText,
  DashboardWidgetSheet_written,
  IDashboardWidgetSheetMode,
  IDashboardWidgetSheetState,
} from "../../models/dashboardWidgetSheet";
import { DashboardEditTiles_label } from "../../components/dashboard/dashboardEditTiles";
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
  const [evaluationSettings] = useState(settings);
  const evaluation = useDashboardEvaluation({ history, stats, settings: evaluationSettings });
  const [sheet, setSheet] = useState<IDashboardWidgetSheetState | undefined>(() => {
    const model = data != null ? LiftographWidgetModel_read(data.snippet) : undefined;
    return model != null ? DashboardWidgetSheet_init(model) : undefined;
  });
  const sheetRef = useRef(sheet);
  sheetRef.current = sheet;
  const [analysis] = useState(() => new LiftographEditorAnalysis(settings));
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

  useEffect(() => {
    analysis.setSettings(settings);
    analysis.setHistory(history);
  }, [settings, history]);

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
    [sheet?.mode, written]
  );

  const openPicker = useModal("liftoEditorExercisePickerModal", (selected) => {
    const current = sheetRef.current;
    const picked = LiftographRail_pickedExercise(selected, settings);
    if (current != null && picked != null) {
      const model = LiftographWidgetModel_pickExercise(
        current.model,
        pickEntryRef.current,
        picked.name,
        picked.equipment
      );
      setSheet(DashboardWidgetSheet_setModel(current, model));
    }
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

  const previewView = (
    <View
      testID="dashboard-widget-preview"
      className="flex-row px-4 py-2 border-b border-border-neutral"
      style={{ backgroundColor: Tailwind_semantic().background.default, zIndex: 1 }}
      pointerEvents="none"
    >
      {preview == null ? null : preview.kind === "error" || preview.kind === "unsupported" ? (
        <Text className="text-sm text-text-error" style={{ flexShrink: 1 }}>
          {preview.message}
        </Text>
      ) : (
        <DashboardWidget id="widget-preview" widget={preview} evaluation={evaluation} isCompact={true} />
      )}
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
                <ScrollView
                  ref={scrollRef}
                  keyboardShouldPersistTaps="handled"
                  stickyHeaderIndices={[0]}
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
                          exerciseType: LiftographWidgetModel_pickerExercise(
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
                </ScrollView>
              ),
            },
            {
              label: "Text",
              children: () => (
                <DashboardWidgetTextEditor
                  header={previewView}
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
