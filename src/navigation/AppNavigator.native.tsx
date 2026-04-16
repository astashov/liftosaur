import { createContext, JSX, useContext } from "react";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type {
  IOnboardingStackParamList,
  IHomeStackParamList,
  IProgramStackParamList,
  IWorkoutStackParamList,
  IGraphsStackParamList,
  IMeStackParamList,
  IRootTabParamList,
  IRootStackParamList,
} from "./types";
import type { IScreen } from "../models/screen";
import { NavScreenMain } from "./screens/NavScreenHome";
import {
  NavScreenPrograms,
  NavScreenEditProgram,
  NavScreenEditProgramExercise,
  NavScreenMuscles,
  NavScreenOnerms,
  NavScreenProgramSelect,
  NavScreenProgramPreview,
} from "./screens/NavScreenProgram";
import {
  NavScreenFirst,
  NavScreenUnits,
  NavScreenSetupEquipment,
  NavScreenSetupPlates,
  NavScreenProgramSelectOnboarding,
  NavScreenProgramsOnboarding,
  NavScreenProgramPreviewOnboarding,
} from "./screens/NavScreenOnboarding";
import { NavScreenProgress, NavScreenFinishDay, NavScreenSubscription } from "./screens/NavScreenWorkout";
import { NavScreenGraphs } from "./screens/NavScreenGraphs";
import {
  NavScreenSettings,
  NavScreenAccount,
  NavScreenTimers,
  NavScreenPlates,
  NavScreenGyms,
  NavScreenExercises,
  NavScreenAppleHealth,
  NavScreenGoogleHealth,
  NavScreenMuscleGroups,
  NavScreenStats,
  NavScreenMeasurements,
  NavScreenExerciseStats,
  NavScreenApiKeys,
} from "./screens/NavScreenMe";
import { Footer2Wrapper } from "./screens/NavScreenFooter2";
import { NavModalMonthCalendar } from "./modals/NavModalMonthCalendar";
import { NavModalExercisePicker } from "./modals/NavModalExercisePicker";
import { NavModalExerciseImageSource } from "./modals/NavModalExerciseImageSource";
import { NavModalExerciseImageLibrary } from "./modals/NavModalExerciseImageLibrary";
import { NavModalExerciseCloneLibrary } from "./modals/NavModalExerciseCloneLibrary";
import { NavModalCustomExercise } from "./modals/NavModalCustomExercise";
import { NavModalMusclesOverride } from "./modals/NavModalMusclesOverride";
import { NavModalExerciseTypesPicker } from "./modals/NavModalExerciseTypesPicker";
import { NavModalExerciseMusclesPicker } from "./modals/NavModalExerciseMusclesPicker";
import { NavModalExercisePickerSettings } from "./modals/NavModalExercisePickerSettings";
import { NavModalWeekInsightsDetails } from "./modals/NavModalWeekInsightsDetails";
import { NavModalSetSplit } from "./modals/NavModalSetSplit";
import { NavModalPlannerSettings } from "./modals/NavModalPlannerSettings";
import { NavModalMuscleGroupMusclePicker } from "./modals/NavModalMuscleGroupMusclePicker";
import { NavModalAccount } from "./modals/NavModalAccount";
import { NavModalCreateProgram } from "./modals/NavModalCreateProgram";
import { NavModalImportFromLink } from "./modals/NavModalImportFromLink";
import { NavModalProgramInfo } from "./modals/NavModalProgramInfo";
import { NavModalInputSelect } from "./modals/NavModalInputSelect";
import { NavModalPlaygroundEditExercise } from "./modals/NavModalPlaygroundEditExercise";
import { NavModalProgramPreviewMuscles } from "./modals/NavModalProgramPreviewMuscles";
import { NavModalAmrap } from "./modals/NavModalAmrap";
import { NavModalNextWorkout } from "./modals/NavModalNextWorkout";
import { NavModalEditTarget } from "./modals/NavModalEditTarget";
import { NavModalGraphs } from "./modals/NavModalGraphs";
import { NavModalStatsSettings } from "./modals/NavModalStatsSettings";
import { NavModal1RM } from "./modals/NavModal1RM";
import { NavModalRepMaxCalculator } from "./modals/NavModalRepMaxCalculator";
import { NavModalDayFromAdhoc } from "./modals/NavModalDayFromAdhoc";
import { NavModalEquipment } from "./modals/NavModalEquipment";
import { NavModalDate } from "./modals/NavModalDate";
import { NavModalWorkoutSuperset } from "./modals/NavModalWorkoutSuperset";
import { NavHeader } from "./NavHeader";

const OnboardingStack = createNativeStackNavigator<IOnboardingStackParamList>();
const HomeStack = createNativeStackNavigator<IHomeStackParamList>();
const ProgramStack = createNativeStackNavigator<IProgramStackParamList>();
const WorkoutStack = createNativeStackNavigator<IWorkoutStackParamList>();
const GraphsStack = createNativeStackNavigator<IGraphsStackParamList>();
const MeStack = createNativeStackNavigator<IMeStackParamList>();
const Tab = createBottomTabNavigator<IRootTabParamList>();
const RootStack = createNativeStackNavigator<IRootStackParamList>();

const stackScreenOptions = { headerShown: false, animation: "slide_from_right" as const, freezeOnBlur: true };
const navHeaderScreenOptions = {
  headerShown: true,
  animation: "slide_from_right" as const,
  freezeOnBlur: true,
  header: NavHeader,
};

function OnboardingStackScreen(): JSX.Element {
  const initialScreen = useContext(InitialScreenContext) as keyof IOnboardingStackParamList | undefined;
  return (
    <OnboardingStack.Navigator screenOptions={stackScreenOptions} initialRouteName={initialScreen || "first"}>
      <OnboardingStack.Screen name="first" component={NavScreenFirst} />
      <OnboardingStack.Screen name="units" component={NavScreenUnits} />
      <OnboardingStack.Screen name="setupequipment" component={NavScreenSetupEquipment} />
      <OnboardingStack.Screen name="setupplates" component={NavScreenSetupPlates} />
      <OnboardingStack.Screen name="programselect" component={NavScreenProgramSelectOnboarding} />
      <OnboardingStack.Screen
        name="programs"
        component={NavScreenProgramsOnboarding}
        options={{ headerShown: true, header: NavHeader }}
      />
      <OnboardingStack.Screen
        name="programPreview"
        component={NavScreenProgramPreviewOnboarding}
        options={{ headerShown: true, header: NavHeader }}
      />
      <OnboardingStack.Screen name="onerms" component={NavScreenOnerms} />
    </OnboardingStack.Navigator>
  );
}

function HomeStackScreen(): JSX.Element {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions}>
      <HomeStack.Screen name="main" component={NavScreenMain} />
      <HomeStack.Screen name="progress" component={NavScreenProgress} getId={({ params }) => String(params?.id ?? 0)} />
    </HomeStack.Navigator>
  );
}

function ProgramStackScreen(): JSX.Element {
  return (
    <ProgramStack.Navigator screenOptions={stackScreenOptions}>
      <ProgramStack.Screen
        name="programs"
        component={NavScreenPrograms}
        options={{ headerShown: true, header: NavHeader }}
      />
      <ProgramStack.Screen name="editProgram" component={NavScreenEditProgram} />
      <ProgramStack.Screen name="editProgramExercise" component={NavScreenEditProgramExercise} />
      <ProgramStack.Screen name="onerms" component={NavScreenOnerms} />
      <ProgramStack.Screen name="programselect" component={NavScreenProgramSelect} />
      <ProgramStack.Screen
        name="programPreview"
        component={NavScreenProgramPreview}
        options={{ headerShown: true, header: NavHeader }}
      />
      <ProgramStack.Screen name="exerciseStats" component={NavScreenExerciseStats} />
    </ProgramStack.Navigator>
  );
}

function WorkoutStackScreen(): JSX.Element {
  return (
    <WorkoutStack.Navigator screenOptions={stackScreenOptions}>
      <WorkoutStack.Screen
        name="progress"
        component={NavScreenProgress}
        getId={({ params }) => String(params?.id ?? 0)}
        options={{ headerShown: true, header: NavHeader }}
      />
      <WorkoutStack.Screen name="finishDay" component={NavScreenFinishDay} />
      <WorkoutStack.Screen name="editProgramExercise" component={NavScreenEditProgramExercise} />
      <WorkoutStack.Screen name="muscles" component={NavScreenMuscles} />
      <WorkoutStack.Screen name="exerciseStats" component={NavScreenExerciseStats} />
    </WorkoutStack.Navigator>
  );
}

function GraphsStackScreen(): JSX.Element {
  return (
    <GraphsStack.Navigator screenOptions={stackScreenOptions}>
      <GraphsStack.Screen
        name="graphs"
        component={NavScreenGraphs}
        options={{ headerShown: true, header: NavHeader }}
      />
      <GraphsStack.Screen
        name="progress"
        component={NavScreenProgress}
        getId={({ params }) => String(params?.id ?? 0)}
        options={{ headerShown: true, header: NavHeader }}
      />
    </GraphsStack.Navigator>
  );
}

function MeStackScreen(): JSX.Element {
  return (
    <MeStack.Navigator screenOptions={navHeaderScreenOptions}>
      <MeStack.Screen name="settings" component={NavScreenSettings} />
      <MeStack.Screen name="account" component={NavScreenAccount} />
      <MeStack.Screen name="timers" component={NavScreenTimers} />
      <MeStack.Screen name="plates" component={NavScreenPlates} />
      <MeStack.Screen name="gyms" component={NavScreenGyms} />
      <MeStack.Screen name="exercises" component={NavScreenExercises} />
      <MeStack.Screen name="appleHealth" component={NavScreenAppleHealth} />
      <MeStack.Screen name="googleHealth" component={NavScreenGoogleHealth} />
      <MeStack.Screen name="muscleGroups" component={NavScreenMuscleGroups} />
      <MeStack.Screen name="stats" component={NavScreenStats} />
      <MeStack.Screen name="measurements" component={NavScreenMeasurements} />
      <MeStack.Screen name="exerciseStats" component={NavScreenExerciseStats} />
      <MeStack.Screen name="apiKeys" component={NavScreenApiKeys} />
      <MeStack.Screen name="programs" component={NavScreenPrograms} />
      <MeStack.Screen name="progress" component={NavScreenProgress} getId={({ params }) => String(params?.id ?? 0)} />
    </MeStack.Navigator>
  );
}

const tabScreenOptions = { headerShown: false };

function MainTabsScreen(): JSX.Element {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions} tabBar={(tabProps) => <Footer2Wrapper {...tabProps} />}>
      <Tab.Screen name="home" component={HomeStackScreen} />
      <Tab.Screen name="program" component={ProgramStackScreen} />
      <Tab.Screen name="workout" component={WorkoutStackScreen} />
      <Tab.Screen name="graphs" component={GraphsStackScreen} />
      <Tab.Screen name="me" component={MeStackScreen} />
    </Tab.Navigator>
  );
}

const onboardingScreens: IScreen[] = ["first", "units", "setupequipment", "setupplates", "programselect"];

const InitialScreenContext = createContext<IScreen | undefined>(undefined);

export function AppNavigator(props: { initialScreen?: IScreen }): JSX.Element {
  const { initialScreen } = props;
  const isOnboarding = initialScreen ? onboardingScreens.includes(initialScreen) : false;
  return (
    <InitialScreenContext.Provider value={initialScreen}>
      <RootStack.Navigator
        screenOptions={{ headerShown: false, animation: "none", freezeOnBlur: true }}
        initialRouteName={isOnboarding ? "onboarding" : "mainTabs"}
      >
        <RootStack.Screen name="onboarding" component={OnboardingStackScreen} />
        <RootStack.Screen name="mainTabs" component={MainTabsScreen} />
        <RootStack.Screen name="subscription" component={NavScreenSubscription} options={{ headerShown: true }} />
        <RootStack.Group
          screenOptions={{
            presentation: "transparentModal",
            headerShown: false,
            animation: "none",
          }}
        >
          <RootStack.Screen name="monthCalendarModal" component={NavModalMonthCalendar} />
          <RootStack.Screen name="exercisePickerModal" component={NavModalExercisePicker} />
          <RootStack.Screen name="exerciseImageLibraryModal" component={NavModalExerciseImageLibrary} />
          <RootStack.Screen name="exerciseCloneLibraryModal" component={NavModalExerciseCloneLibrary} />
          <RootStack.Screen name="customExerciseModal" component={NavModalCustomExercise} />
          <RootStack.Screen name="musclesOverrideModal" component={NavModalMusclesOverride} />
        </RootStack.Group>
        <RootStack.Group
          screenOptions={{
            presentation: "formSheet",
            headerShown: false,
            animation: "default",
            sheetAllowedDetents: "fitToContents",
            contentStyle: { backgroundColor: Tailwind_semantic().background.default },
          }}
        >
          <RootStack.Screen name="weekInsightsDetailsModal" component={NavModalWeekInsightsDetails} />
          <RootStack.Screen name="setSplitModal" component={NavModalSetSplit} />
          <RootStack.Screen name="plannerSettingsModal" component={NavModalPlannerSettings} />
          <RootStack.Screen
            name="muscleGroupMusclePickerModal"
            component={NavModalMuscleGroupMusclePicker}
            options={{
              sheetAllowedDetents: [0.9],
              headerShown: true,
              title: "Choose Muscles",
            }}
          />
          <RootStack.Screen name="accountModal" component={NavModalAccount} />
          <RootStack.Screen name="createProgramModal" component={NavModalCreateProgram} />
          <RootStack.Screen name="importFromLinkModal" component={NavModalImportFromLink} />
          <RootStack.Screen name="programInfoModal" component={NavModalProgramInfo} />
          <RootStack.Screen name="inputSelectModal" component={NavModalInputSelect} />
          <RootStack.Screen name="playgroundEditModal" component={NavModalPlaygroundEditExercise} />
          <RootStack.Screen name="amrapModal" component={NavModalAmrap} />
          <RootStack.Screen name="editSetTargetModal" component={NavModalEditTarget} />
          <RootStack.Screen
            name="programPreviewMusclesModal"
            component={NavModalProgramPreviewMuscles}
            options={{ sheetAllowedDetents: [0.85] }}
          />
          <RootStack.Screen name="nextWorkoutModal" component={NavModalNextWorkout} />
          <RootStack.Screen name="graphsModal" component={NavModalGraphs} options={{ sheetAllowedDetents: [0.9] }} />
          <RootStack.Screen name="statsSettingsModal" component={NavModalStatsSettings} />
          <RootStack.Screen name="rm1Modal" component={NavModal1RM} />
          <RootStack.Screen name="repMaxCalculatorModal" component={NavModalRepMaxCalculator} />
          <RootStack.Screen name="dayFromAdhocModal" component={NavModalDayFromAdhoc} />
          <RootStack.Screen name="equipmentModal" component={NavModalEquipment} />
          <RootStack.Screen name="dateModal" component={NavModalDate} />
          <RootStack.Screen name="supersetPickerModal" component={NavModalWorkoutSuperset} />
          <RootStack.Screen name="exerciseImageSourceModal" component={NavModalExerciseImageSource} />
          <RootStack.Screen name="exercisePickerSettingsModal" component={NavModalExercisePickerSettings} />
          <RootStack.Screen name="exerciseTypesPickerModal" component={NavModalExerciseTypesPicker} />
          <RootStack.Screen
            name="exerciseMusclesPickerModal"
            component={NavModalExerciseMusclesPicker}
            options={{ sheetAllowedDetents: [0.9] }}
          />
        </RootStack.Group>
      </RootStack.Navigator>
    </InitialScreenContext.Provider>
  );
}
