import { JSX, useEffect, useState } from "react";
import { View } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { KeyboardSheet } from "../KeyboardSheet";
import type { IRootStackParamList } from "../types";
import { Button } from "../../components/button";
import { Text } from "../../components/primitives/text";
import { ScrollableTabs } from "../../components/scrollableTabs";
import { InputWeight2 } from "../../components/inputWeight2";
import { Program_getProgram } from "../../models/program";
import { Progress_getCurrentProgress } from "../../models/progress";
import { Weight_display } from "../../models/weight";
import {
  IProgramWeightDraft,
  IProgramWeightRow,
  IProgramWeightTab,
  ProgramWeightScale_canApply,
  ProgramWeightScale_draftKey,
  ProgramWeightScale_draftValue,
  ProgramWeightScale_sections,
  ProgramWeightScale_setLabel,
  ProgramWeightScale_sheet,
  ProgramWeightScale_tabLabel,
  ProgramWeightScale_value,
} from "../../models/programWeightScale";
import { Thunk_updateProgramWeight } from "../../ducks/thunks";
import { IExerciseType, ISettings } from "../../types";

export function NavModalUpdateProgramWeight(): JSX.Element {
  const route = useRoute<{
    key: string;
    name: "updateProgramWeightModal";
    params: IRootStackParamList["updateProgramWeightModal"];
  }>();
  const { programExerciseId, setId } = route.params;
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const settings = state.storage.settings;

  const [sheet] = useState(() => {
    const progress = Progress_getCurrentProgress(state);
    const program = progress ? Program_getProgram(state, progress.programId) : undefined;
    return ProgramWeightScale_sheet(program, progress, programExerciseId, setId, settings);
  });
  const [draft, setDraft] = useState<IProgramWeightDraft>({});

  useEffect(() => {
    if (sheet == null) {
      navigation.goBack();
    }
  }, [sheet]);

  if (sheet == null) {
    return <></>;
  }

  const { deviation, tabs, exerciseType } = sheet;
  const canApply = ProgramWeightScale_canApply(tabs, draft);

  const onApply = (): void => {
    dispatch(Thunk_updateProgramWeight(sheet.target, tabs, draft));
    navigation.goBack();
  };

  const tabContent = (tab: IProgramWeightTab, tabIndex: number): JSX.Element => (
    <TabRows
      key={tabIndex}
      tab={tab}
      tabIndex={tabIndex}
      draft={draft}
      settings={settings}
      exerciseType={exerciseType}
      onChange={(key, value) => setDraft((d) => ({ ...d, [key]: value }))}
    />
  );

  const footer = (
    <View className="px-4 pt-4 pb-2">
      <Button
        name="update-program-weight-apply"
        type="button"
        kind="purple"
        className="w-full"
        disabled={!canApply}
        onClick={onApply}
      >
        Apply
      </Button>
    </View>
  );

  return (
    <KeyboardSheet
      header="Update program weights"
      footer={footer}
      showCloseButton={true}
      onClose={() => navigation.goBack()}
    >
      <View className="px-4 pb-2 bg-background-default">
        <Text className="text-sm">
          Today you lifted <Text className="text-sm font-bold">{Weight_display(deviation.completedWeight)}</Text>.
          That's for this workout only.
        </Text>
        <Text className="mt-1 text-sm">
          Your program says <Text className="text-sm font-bold">{Weight_display(deviation.targetWeight)}</Text>. That's
          what the app gives you next time.
        </Text>
        <Text className="mt-1 text-sm text-text-secondary">
          Apply changes the program weights below. Today's remaining sets follow them.
        </Text>
        {tabs.length === 1 ? (
          tabContent(tabs[0], 0)
        ) : (
          <ScrollableTabs
            topPadding="12"
            defaultIndex={sheet.currentTabIndex}
            shouldNotExpand={true}
            nonSticky={true}
            color="purple"
            tabs={tabs.map((tab, tabIndex) => ({
              label: ProgramWeightScale_tabLabel(tab),
              children: () => tabContent(tab, tabIndex),
            }))}
          />
        )}
      </View>
    </KeyboardSheet>
  );
}

interface ITabRowsProps {
  tab: IProgramWeightTab;
  tabIndex: number;
  draft: IProgramWeightDraft;
  settings: ISettings;
  exerciseType?: IExerciseType;
  onChange: (key: string, value: IProgramWeightDraft[string]) => void;
}

function TabRows(props: ITabRowsProps): JSX.Element {
  return (
    <View className="mt-2">
      {ProgramWeightScale_sections(props.tab).map((section) => (
        <View key={section.key}>
          {section.dayName != null && <Text className="mt-3 mb-1 font-semibold">{section.dayName}</Text>}
          {section.variationLabel != null && (
            <Text className="mb-1 text-xs text-text-secondary">{section.variationLabel}</Text>
          )}
          {section.rows.map((row) => (
            <WeightRow key={row.id} {...props} row={row} />
          ))}
        </View>
      ))}
    </View>
  );
}

function WeightRow(props: ITabRowsProps & { row: IProgramWeightRow }): JSX.Element {
  const { row, tabIndex } = props;
  const key = ProgramWeightScale_draftKey(tabIndex, row);
  const oldWeight = row.oldWeight != null ? Weight_display(row.oldWeight) : "—";
  return (
    <View className="flex-row items-center gap-2 py-1">
      <Text className="flex-1 text-sm">
        {ProgramWeightScale_setLabel(row)} × {row.repsLabel} reps
      </Text>
      <Text className="text-sm text-text-secondary">{oldWeight}</Text>
      {row.isEditable ? (
        <>
          <Text className="text-sm text-text-secondary">→</Text>
          <InputWeight2
            name={`update-program-weight-${key}`}
            width={4}
            exerciseType={props.exerciseType}
            units={["lb", "kg"] as const}
            inputCommitMode="live"
            showUnitInside={true}
            value={ProgramWeightScale_value(tabIndex, row, props.draft)}
            onInput={(value) => props.onChange(key, ProgramWeightScale_draftValue(value))}
            max={9999}
            min={0}
            settings={props.settings}
          />
        </>
      ) : (
        <Text className="text-xs text-text-secondary">unchanged</Text>
      )}
    </View>
  );
}
