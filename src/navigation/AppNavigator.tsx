import { JSX } from "react";
import { createStackNavigator } from "@react-navigation/stack";
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

const OnboardingStack = createStackNavigator<IOnboardingStackParamList>();
const HomeStack = createStackNavigator<IHomeStackParamList>();
const ProgramStack = createStackNavigator<IProgramStackParamList>();
const WorkoutStack = createStackNavigator<IWorkoutStackParamList>();
const GraphsStack = createStackNavigator<IGraphsStackParamList>();
const MeStack = createStackNavigator<IMeStackParamList>();
const Tab = createBottomTabNavigator<IRootTabParamList>();
const RootStack = createStackNavigator<IRootStackParamList>();

function getStackScreenOptions() {
  return {
    header: NavHeader,
    animationEnabled: false,
    cardStyle: { flex: 1, overflow: "hidden" as const, backgroundColor: Tailwind_semantic().background.default },
  };
}

const onboardingScreenOptions = {
  headerShown: false,
  animationEnabled: false,
  cardStyle: { flex: 1, backgroundColor: Tailwind_semantic().background.default },
};

function OnboardingStackScreen(): JSX.Element {
  return (
    <OnboardingStack.Navigator screenOptions={onboardingScreenOptions}>
      <OnboardingStack.Screen name="first" component={NavScreenFirst} />
      <OnboardingStack.Screen name="units" component={NavScreenUnits} />
      <OnboardingStack.Screen name="setupequipment" component={NavScreenSetupEquipment} />
      <OnboardingStack.Screen name="setupplates" component={NavScreenSetupPlates} />
      <OnboardingStack.Screen name="onboarding/programselect" component={NavScreenProgramSelectOnboarding} />
      <OnboardingStack.Screen name="onboarding/programs" component={NavScreenProgramsOnboarding} />
      <OnboardingStack.Screen name="onboarding/programPreview" component={NavScreenProgramPreviewOnboarding} />
    </OnboardingStack.Navigator>
  );
}

function HomeStackScreen(): JSX.Element {
  return (
    <HomeStack.Navigator screenOptions={getStackScreenOptions()}>
      <HomeStack.Screen name="main" component={NavScreenMain} />
    </HomeStack.Navigator>
  );
}

function ProgramStackScreen(): JSX.Element {
  return (
    <ProgramStack.Navigator screenOptions={getStackScreenOptions()}>
      <ProgramStack.Screen name="programs" component={NavScreenPrograms} />
      <ProgramStack.Screen name="editProgram" component={NavScreenEditProgram} />
      <ProgramStack.Screen name="editProgramExercise" component={NavScreenEditProgramExercise} />
      <ProgramStack.Screen name="muscles" component={NavScreenMuscles} />
      <ProgramStack.Screen name="onerms" component={NavScreenOnerms} />
      <ProgramStack.Screen name="programselect" component={NavScreenProgramSelect} />
      <ProgramStack.Screen name="programPreview" component={NavScreenProgramPreview} />
    </ProgramStack.Navigator>
  );
}

function WorkoutStackScreen(): JSX.Element {
  return (
    <WorkoutStack.Navigator screenOptions={getStackScreenOptions()}>
      <WorkoutStack.Screen name="progress" component={NavScreenProgress} />
      <WorkoutStack.Screen name="finishDay" component={NavScreenFinishDay} />
      <WorkoutStack.Screen name="subscription" component={NavScreenSubscription} />
    </WorkoutStack.Navigator>
  );
}

function GraphsStackScreen(): JSX.Element {
  return (
    <GraphsStack.Navigator screenOptions={getStackScreenOptions()}>
      <GraphsStack.Screen name="graphs" component={NavScreenGraphs} />
    </GraphsStack.Navigator>
  );
}

function MeStackScreen(): JSX.Element {
  return (
    <MeStack.Navigator screenOptions={getStackScreenOptions()}>
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
    </MeStack.Navigator>
  );
}

const tabScreenOptions = { headerShown: false };
function getRootScreenOptions() {
  return {
    headerShown: false,
    animationEnabled: false,
    cardStyle: { flex: 1, backgroundColor: Tailwind_semantic().background.default },
  };
}

function MainTabsScreen(): JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={tabScreenOptions}
      tabBar={(tabProps) => <Footer2Wrapper {...tabProps} />}
    >
      <Tab.Screen name="homeTab" component={HomeStackScreen} />
      <Tab.Screen name="programTab" component={ProgramStackScreen} />
      <Tab.Screen name="workoutTab" component={WorkoutStackScreen} />
      <Tab.Screen name="graphsTab" component={GraphsStackScreen} />
      <Tab.Screen name="meTab" component={MeStackScreen} />
    </Tab.Navigator>
  );
}

const onboardingScreens: IScreen[] = ["first", "units", "setupequipment", "setupplates"];

export function AppNavigator(props: { initialScreen?: IScreen }): JSX.Element {
  const { initialScreen } = props;
  const isOnboarding = initialScreen ? onboardingScreens.includes(initialScreen) : false;
  return (
    <RootStack.Navigator
      screenOptions={getRootScreenOptions()}
      initialRouteName={isOnboarding ? "onboarding" : "mainTabs"}
    >
      <RootStack.Screen name="onboarding" component={OnboardingStackScreen} />
      <RootStack.Screen name="mainTabs" component={MainTabsScreen} />
    </RootStack.Navigator>
  );
}
