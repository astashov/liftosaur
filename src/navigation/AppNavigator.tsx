import { JSX, createContext, useContext } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAppState } from "./StateContext";
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
import { NavHeader } from "./NavHeader";
import { Tailwind_semantic } from "../utils/tailwindConfig";
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
import { NavModalAmrap } from "./modals/NavModalAmrap";
import { NavModalExercisePicker } from "./modals/NavModalExercisePicker";
import { NavModalEditProgramExercisePicker } from "./modals/NavModalEditProgramExercisePicker";
import { NavModalEditTarget } from "./modals/NavModalEditTarget";
import { NavModalDate } from "./modals/NavModalDate";
import { NavModal1RM } from "./modals/NavModal1RM";
import { NavModalEquipment } from "./modals/NavModalEquipment";
import { NavModalWorkoutSuperset } from "./modals/NavModalWorkoutSuperset";
import { NavModalPlaygroundEditExercise } from "./modals/NavModalPlaygroundEditExercise";
import { NavModalExerciseInfo } from "./modals/NavModalExerciseInfo";
import { NavModalCoupon } from "./modals/NavModalCoupon";
import { NavModalNewGym } from "./modals/NavModalNewGym";
import { NavModalCreateProgram } from "./modals/NavModalCreateProgram";
import { NavModalImportFromLink } from "./modals/NavModalImportFromLink";
import { NavModalAffiliate } from "./modals/NavModalAffiliate";
import { NavModalImportFromOtherApps } from "./modals/NavModalImportFromOtherApps";
import { NavModalDayFromAdhoc } from "./modals/NavModalDayFromAdhoc";
import { NavModalNextWorkout } from "./modals/NavModalNextWorkout";
import { NavModalWhatsnew } from "./modals/NavModalWhatsnew";
import { NavModalSignupRequest } from "./modals/NavModalSignupRequest";
import { NavModalThanks25 } from "./modals/NavModalThanks25";
import { NavModalCorruptedState } from "./modals/NavModalCorruptedState";
import { NavModalDebug } from "./modals/NavModalDebug";
import { NavModalWorkoutShare } from "./modals/NavModalWorkoutShare";
import { NavModalSocialShare } from "./modals/NavModalSocialShare";
import { NavModalCustomExercise } from "./modals/NavModalCustomExercise";
import { NavModalMusclesOverride } from "./modals/NavModalMusclesOverride";
import { NavModalEditProgramExerciseSet } from "./modals/NavModalEditProgramExerciseSet";
import { NavModalEditProgramExerciseSuperset } from "./modals/NavModalEditProgramExerciseSuperset";
import { NavModalCreateStateVariable } from "./modals/NavModalCreateStateVariable";
import { NavModalTour } from "./modals/NavModalTour";
import { NavModalEditProgramMenu } from "./modals/NavModalEditProgramMenu";
import { NavModalProgramNextDay } from "./modals/NavModalProgramNextDay";
import { NavModalProgramImageExport } from "./modals/NavModalProgramImageExport";
import { NavModalProgramRevisions } from "./modals/NavModalProgramRevisions";
import { NavModalEditProgressScript } from "./modals/NavModalEditProgressScript";
import { NavModalEditUpdateScript } from "./modals/NavModalEditUpdateScript";
import { NavModalMonthCalendar } from "./modals/NavModalMonthCalendar";
import { NavModalAccount } from "./modals/NavModalAccount";
import { NavModalSubscriptionInfo } from "./modals/NavModalSubscriptionInfo";
import { NavModalWeekInsightsDetails } from "./modals/NavModalWeekInsightsDetails";
import { NavModalPlannerSettings } from "./modals/NavModalPlannerSettings";
import { NavModalEditMuscleGroups } from "./modals/NavModalEditMuscleGroups";
import { NavModalWeekStats } from "./modals/NavModalWeekStats";
import { NavModalDayStats } from "./modals/NavModalDayStats";
import { NavModalExerciseStats } from "./modals/NavModalExerciseStats";
import { NavModalEditExerciseChange } from "./modals/NavModalEditExerciseChange";
import { NavModalGraphs } from "./modals/NavModalGraphs";
import { NavModalStatsSettings } from "./modals/NavModalStatsSettings";
import { NavModalProgramInfo } from "./modals/NavModalProgramInfo";
import { NavModalChangeNextDay } from "./modals/NavModalChangeNextDay";
import { NavModalInputSelect } from "./modals/NavModalInputSelect";
import { NavModalTextInput } from "./modals/NavModalTextInput";
import { NavModalRepMaxCalculator } from "./modals/NavModalRepMaxCalculator";
import { NavModalMuscleGroupMusclePicker } from "./modals/NavModalMuscleGroupMusclePicker";
import { NavModalPhotoPicker } from "./modals/NavModalPhotoPicker";
import { NavModalExerciseImageSource } from "./modals/NavModalExerciseImageSource";
import { NavModalExerciseImageLibrary } from "./modals/NavModalExerciseImageLibrary";
import { NavModalExerciseCloneLibrary } from "./modals/NavModalExerciseCloneLibrary";
import { NavModalExerciseTypesPicker } from "./modals/NavModalExerciseTypesPicker";
import { NavModalExerciseMusclesPicker } from "./modals/NavModalExerciseMusclesPicker";

const OnboardingStack = createStackNavigator<IOnboardingStackParamList>();
const HomeStack = createStackNavigator<IHomeStackParamList>();
const ProgramStack = createStackNavigator<IProgramStackParamList>();
const WorkoutStack = createStackNavigator<IWorkoutStackParamList>();
const GraphsStack = createStackNavigator<IGraphsStackParamList>();
const MeStack = createStackNavigator<IMeStackParamList>();
const Tab = createBottomTabNavigator<IRootTabParamList>();
const RootStack = createStackNavigator<IRootStackParamList>();

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function useStackScreenOptions() {
  useAppState();
  return {
    header: NavHeader,
    animationEnabled: false,
    cardStyle: { flex: 1, overflow: "hidden" as const, backgroundColor: Tailwind_semantic().background.default },
  };
}

function OnboardingStackScreen(): JSX.Element {
  const screenOptions = useStackScreenOptions();
  const initialScreen = useContext(InitialScreenContext) as keyof IOnboardingStackParamList | undefined;
  return (
    <OnboardingStack.Navigator screenOptions={screenOptions} initialRouteName={initialScreen || "first"}>
      <OnboardingStack.Screen name="first" component={NavScreenFirst} />
      <OnboardingStack.Screen name="units" component={NavScreenUnits} />
      <OnboardingStack.Screen name="setupequipment" component={NavScreenSetupEquipment} />
      <OnboardingStack.Screen name="setupplates" component={NavScreenSetupPlates} />
      <OnboardingStack.Screen name="programselect" component={NavScreenProgramSelectOnboarding} />
      <OnboardingStack.Screen name="programs" component={NavScreenProgramsOnboarding} />
      <OnboardingStack.Screen name="programPreview" component={NavScreenProgramPreviewOnboarding} />
      <OnboardingStack.Screen name="onerms" component={NavScreenOnerms} />
    </OnboardingStack.Navigator>
  );
}

function HomeStackScreen(): JSX.Element {
  const screenOptions = useStackScreenOptions();
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen name="main" component={NavScreenMain} />
      <HomeStack.Screen name="progress" component={NavScreenProgress} getId={({ params }) => String(params?.id ?? 0)} />
    </HomeStack.Navigator>
  );
}

function ProgramStackScreen(): JSX.Element {
  const screenOptions = useStackScreenOptions();
  return (
    <ProgramStack.Navigator screenOptions={screenOptions}>
      <ProgramStack.Screen name="programs" component={NavScreenPrograms} />
      <ProgramStack.Screen name="editProgram" component={NavScreenEditProgram} />
      <ProgramStack.Screen name="editProgramExercise" component={NavScreenEditProgramExercise} />
      <ProgramStack.Screen name="onerms" component={NavScreenOnerms} />
      <ProgramStack.Screen name="programselect" component={NavScreenProgramSelect} />
      <ProgramStack.Screen name="programPreview" component={NavScreenProgramPreview} />
      <ProgramStack.Screen name="exerciseStats" component={NavScreenExerciseStats} />
    </ProgramStack.Navigator>
  );
}

function WorkoutStackScreen(): JSX.Element {
  const screenOptions = useStackScreenOptions();
  return (
    <WorkoutStack.Navigator screenOptions={screenOptions}>
      <WorkoutStack.Screen
        name="progress"
        component={NavScreenProgress}
        getId={({ params }) => String(params?.id ?? 0)}
      />
      <WorkoutStack.Screen name="finishDay" component={NavScreenFinishDay} />
      <WorkoutStack.Screen name="editProgramExercise" component={NavScreenEditProgramExercise} />
      <WorkoutStack.Screen name="muscles" component={NavScreenMuscles} />
      <WorkoutStack.Screen name="exerciseStats" component={NavScreenExerciseStats} />
    </WorkoutStack.Navigator>
  );
}

function GraphsStackScreen(): JSX.Element {
  const screenOptions = useStackScreenOptions();
  return (
    <GraphsStack.Navigator screenOptions={screenOptions}>
      <GraphsStack.Screen name="graphs" component={NavScreenGraphs} />
      <GraphsStack.Screen
        name="progress"
        component={NavScreenProgress}
        getId={({ params }) => String(params?.id ?? 0)}
      />
    </GraphsStack.Navigator>
  );
}

function MeStackScreen(): JSX.Element {
  const screenOptions = useStackScreenOptions();
  return (
    <MeStack.Navigator screenOptions={screenOptions}>
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

const tabScreenOptions = {
  headerShown: false,
  sceneStyle: { flex: 1, overflow: "hidden" as const },
};
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function useRootScreenOptions() {
  useAppState();
  return {
    headerShown: false,
    animationEnabled: false,
    cardStyle: { flex: 1, backgroundColor: Tailwind_semantic().background.default },
  };
}

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
  const rootScreenOptions = useRootScreenOptions();
  const stackScreenOptions = useStackScreenOptions();
  const isOnboarding = initialScreen ? onboardingScreens.includes(initialScreen) : false;
  return (
    <InitialScreenContext.Provider value={initialScreen}>
      <RootStack.Navigator
        screenOptions={rootScreenOptions}
        initialRouteName={isOnboarding ? "onboarding" : "mainTabs"}
      >
        <RootStack.Screen name="onboarding" component={OnboardingStackScreen} />
        <RootStack.Screen name="mainTabs" component={MainTabsScreen} />
        <RootStack.Screen
          name="subscription"
          component={NavScreenSubscription}
          options={{ ...stackScreenOptions, headerShown: true }}
        />
        <RootStack.Group
          screenOptions={{
            presentation: "transparentModal",
            headerShown: false,
            cardOverlayEnabled: false,
            cardStyle: { backgroundColor: "transparent" },
          }}
        >
          <RootStack.Screen name="amrapModal" component={NavModalAmrap} />
          <RootStack.Screen name="exercisePickerModal" component={NavModalExercisePicker} />
          <RootStack.Screen name="editProgramExercisePickerModal" component={NavModalEditProgramExercisePicker} />
          <RootStack.Screen name="editSetTargetModal" component={NavModalEditTarget} />
          <RootStack.Screen name="dateModal" component={NavModalDate} />
          <RootStack.Screen name="rm1Modal" component={NavModal1RM} />
          <RootStack.Screen name="equipmentModal" component={NavModalEquipment} />
          <RootStack.Screen name="supersetPickerModal" component={NavModalWorkoutSuperset} />
          <RootStack.Screen name="playgroundEditModal" component={NavModalPlaygroundEditExercise} />
          <RootStack.Screen name="exerciseInfoModal" component={NavModalExerciseInfo} />
          <RootStack.Screen name="couponModal" component={NavModalCoupon} />
          <RootStack.Screen name="newGymModal" component={NavModalNewGym} />
          <RootStack.Screen name="createProgramModal" component={NavModalCreateProgram} />
          <RootStack.Screen name="importFromLinkModal" component={NavModalImportFromLink} />
          <RootStack.Screen name="affiliateModal" component={NavModalAffiliate} />
          <RootStack.Screen name="importFromOtherAppsModal" component={NavModalImportFromOtherApps} />
          <RootStack.Screen name="dayFromAdhocModal" component={NavModalDayFromAdhoc} />
          <RootStack.Screen name="nextWorkoutModal" component={NavModalNextWorkout} />
          <RootStack.Screen name="whatsnewModal" component={NavModalWhatsnew} />
          <RootStack.Screen name="signupRequestModal" component={NavModalSignupRequest} />
          <RootStack.Screen name="thanks25Modal" component={NavModalThanks25} />
          <RootStack.Screen name="corruptedStateModal" component={NavModalCorruptedState} />
          <RootStack.Screen name="debugModal" component={NavModalDebug} />
          <RootStack.Screen name="workoutShareModal" component={NavModalWorkoutShare} />
          <RootStack.Screen name="socialShareModal" component={NavModalSocialShare} />
          <RootStack.Screen name="customExerciseModal" component={NavModalCustomExercise} />
          <RootStack.Screen name="musclesOverrideModal" component={NavModalMusclesOverride} />
          <RootStack.Screen name="editProgramExerciseSetModal" component={NavModalEditProgramExerciseSet} />
          <RootStack.Screen name="editProgramExerciseSupersetModal" component={NavModalEditProgramExerciseSuperset} />
          <RootStack.Screen name="createStateVariableModal" component={NavModalCreateStateVariable} />
          <RootStack.Screen name="tourModal" component={NavModalTour} />
          <RootStack.Screen name="editProgramMenuModal" component={NavModalEditProgramMenu} />
          <RootStack.Screen name="programNextDayModal" component={NavModalProgramNextDay} />
          <RootStack.Screen name="programImageExportModal" component={NavModalProgramImageExport} />
          <RootStack.Screen name="programRevisionsModal" component={NavModalProgramRevisions} />
          <RootStack.Screen name="editProgressScriptModal" component={NavModalEditProgressScript} />
          <RootStack.Screen name="editUpdateScriptModal" component={NavModalEditUpdateScript} />
          <RootStack.Screen name="monthCalendarModal" component={NavModalMonthCalendar} />
          <RootStack.Screen name="accountModal" component={NavModalAccount} />
          <RootStack.Screen name="subscriptionInfoModal" component={NavModalSubscriptionInfo} />
          <RootStack.Screen name="weekInsightsDetailsModal" component={NavModalWeekInsightsDetails} />
          <RootStack.Screen name="plannerSettingsModal" component={NavModalPlannerSettings} />
          <RootStack.Screen name="editMuscleGroupsModal" component={NavModalEditMuscleGroups} />
          <RootStack.Screen name="weekStatsModal" component={NavModalWeekStats} />
          <RootStack.Screen name="dayStatsModal" component={NavModalDayStats} />
          <RootStack.Screen name="exerciseStatsModal" component={NavModalExerciseStats} />
          <RootStack.Screen name="editExerciseChangeModal" component={NavModalEditExerciseChange} />
          <RootStack.Screen name="graphsModal" component={NavModalGraphs} />
          <RootStack.Screen name="statsSettingsModal" component={NavModalStatsSettings} />
          <RootStack.Screen name="programInfoModal" component={NavModalProgramInfo} />
          <RootStack.Screen name="changeNextDayModal" component={NavModalChangeNextDay} />
          <RootStack.Screen name="inputSelectModal" component={NavModalInputSelect} />
          <RootStack.Screen name="textInputModal" component={NavModalTextInput} />
          <RootStack.Screen name="repMaxCalculatorModal" component={NavModalRepMaxCalculator} />
          <RootStack.Screen name="muscleGroupMusclePickerModal" component={NavModalMuscleGroupMusclePicker} />
          <RootStack.Screen name="photoPickerModal" component={NavModalPhotoPicker} />
          <RootStack.Screen name="exerciseImageSourceModal" component={NavModalExerciseImageSource} />
          <RootStack.Screen name="exerciseImageLibraryModal" component={NavModalExerciseImageLibrary} />
          <RootStack.Screen name="exerciseCloneLibraryModal" component={NavModalExerciseCloneLibrary} />
          <RootStack.Screen name="exerciseTypesPickerModal" component={NavModalExerciseTypesPicker} />
          <RootStack.Screen name="exerciseMusclesPickerModal" component={NavModalExerciseMusclesPicker} />
        </RootStack.Group>
      </RootStack.Navigator>
    </InitialScreenContext.Provider>
  );
}
