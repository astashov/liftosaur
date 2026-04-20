import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../components/primitives/text";
import { useAppState } from "../StateContext";
import { buildNavCommon } from "../utils";
import { NavScreenContent } from "../NavScreenContent";
import { ChooseProgramView } from "../../components/chooseProgram";
import { ScreenMusclesProgram } from "../../components/muscles/screenMusclesProgram";
import { ScreenMusclesDay } from "../../components/muscles/screenMusclesDay";
import { ScreenProgramPreview as ScreenProgramPreviewComponent } from "../../components/screenProgramPreview";
import { Program_getProgram, Program_fullProgram } from "../../models/program";
import { Progress_getCurrentProgress } from "../../models/progress";
import { Thunk_pullScreen } from "../../ducks/thunks";
import { usePlaygroundModalBridges } from "../usePlaygroundModalBridges";
import { PlannerEditorView } from "../../pages/planner/components/plannerEditorView";

export function NavScreenPrograms(): React.JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  return (
    <ChooseProgramView
      navCommon={navCommon}
      settings={state.storage.settings}
      dispatch={dispatch}
      progress={Progress_getCurrentProgress(state)}
      programs={state.programs || []}
      programsIndex={state.programsIndex || []}
      customPrograms={state.storage.programs || []}
      editProgramId={Progress_getCurrentProgress(state)?.programId}
    />
  );
}

const SAMPLE_PLANNER = `# Week 1
## Day 1
Squat / 3x5 100lb
Bench Press, Barbell / 3x5 80lb
Deadlift / 1x5 120lb

## Day 2
Overhead Press / 3x5 50lb
Row, Barbell / 3x8 60lb
`;

export function NavScreenEditProgram(): React.JSX.Element {
  const [value, setValue] = useState(SAMPLE_PLANNER);
  const [line, setLine] = useState(0);
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-background-default"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 16,
        paddingLeft: insets.left + 16,
        paddingRight: insets.right + 16,
      }}
    >
      <Text className="text-xl font-bold mb-2">WebviewEditor test (planner mode)</Text>
      <Text className="text-sm text-text-secondary mb-3">Current line: {line}</Text>
      <PlannerEditorView
        name="test"
        value={value}
        onChange={setValue}
        onLineChange={setLine}
        customExercises={{}}
        exerciseFullNames={[]}
        lineNumbers={true}
        height={360}
      />
      <Text className="text-sm font-bold mt-4 mb-1">Value (from onChange):</Text>
      <View className="border border-border-neutral rounded-lg p-2">
        <Text className="text-xs" style={{ fontFamily: "Courier" }}>
          {value}
        </Text>
      </View>
    </ScrollView>
  );
}

export function NavScreenEditProgramExercise(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Edit Exercise</Text>
    </View>
  );
}

export function NavScreenMuscles(): React.JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);
  const type = state.muscleView || {
    type: "program" as const,
    programId: state.storage.currentProgramId || state.storage.programs[0]?.id,
  };
  if (type.programId == null) {
    throw new Error("Opened 'muscles' screen, but 'state.storage.currentProgramId' is null");
  }
  let program = Program_getProgram(state, type.programId);
  if (program == null) {
    throw new Error("Opened 'muscles' screen, but 'program' is null");
  }
  program = Program_fullProgram(program, state.storage.settings);
  if (type.type === "program") {
    return (
      <NavScreenContent>
        <ScreenMusclesProgram
          navCommon={navCommon}
          dispatch={dispatch}
          program={program}
          settings={state.storage.settings}
        />
      </NavScreenContent>
    );
  }
  return (
    <NavScreenContent>
      <ScreenMusclesDay
        navCommon={navCommon}
        dispatch={dispatch}
        program={program}
        day={type.day ?? 1}
        settings={state.storage.settings}
      />
    </NavScreenContent>
  );
}

export function NavScreenOnerms(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">1 Rep Maxes</Text>
    </View>
  );
}

export function NavScreenProgramSelect(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center bg-background-default">
      <Text className="text-2xl font-bold text-icon-neutral">Select Program</Text>
    </View>
  );
}

export function NavScreenProgramPreview(): React.JSX.Element {
  const { state, dispatch } = useAppState();
  const navCommon = buildNavCommon(state);

  usePlaygroundModalBridges(state);

  if (state.previewProgram?.id == null) {
    setTimeout(() => dispatch(Thunk_pullScreen()), 0);
    return <View className="flex-1 bg-background-default" />;
  }
  return (
    <ScreenProgramPreviewComponent
      navCommon={navCommon}
      dispatch={dispatch}
      settings={state.storage.settings}
      selectedProgramId={state.previewProgram.id}
      programs={state.previewProgram.showCustomPrograms ? state.storage.programs : state.programs}
      subscription={state.storage.subscription}
    />
  );
}
