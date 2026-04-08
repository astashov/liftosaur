import { JSX } from "react";
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

const OnboardingStack = createNativeStackNavigator<IOnboardingStackParamList>();
const HomeStack = createNativeStackNavigator<IHomeStackParamList>();
const ProgramStack = createNativeStackNavigator<IProgramStackParamList>();
const WorkoutStack = createNativeStackNavigator<IWorkoutStackParamList>();
const GraphsStack = createNativeStackNavigator<IGraphsStackParamList>();
const MeStack = createNativeStackNavigator<IMeStackParamList>();
const Tab = createBottomTabNavigator<IRootTabParamList>();
const RootStack = createNativeStackNavigator<IRootStackParamList>();

const stackScreenOptions = { headerShown: false, animation: "none" as const };

function OnboardingStackScreen(): JSX.Element {
  return (
    <OnboardingStack.Navigator screenOptions={stackScreenOptions}>
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
  return (
    <WorkoutStack.Navigator screenOptions={stackScreenOptions}>
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
  return (
    <GraphsStack.Navigator screenOptions={stackScreenOptions}>
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
  return (
    <MeStack.Navigator screenOptions={stackScreenOptions}>
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

export function AppNavigator(): JSX.Element {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false, animation: "none" }} initialRouteName="mainTabs">
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
      </RootStack.Group>
    </RootStack.Navigator>
  );
}
