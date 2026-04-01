import { JSX } from "react";
import { createStackNavigator, type StackHeaderProps } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type {
  IHomeStackParamList,
  IProgramStackParamList,
  IWorkoutStackParamList,
  IGraphsStackParamList,
  IMeStackParamList,
  IRootTabParamList,
} from "./types";
import type { IScreen } from "../models/screen";
import { Screen_tab } from "../models/screen";
import { NavScreenMain } from "./screens/NavScreenHome";
import {
  NavScreenPrograms,
  NavScreenEditProgram,
  NavScreenEditProgramExercise,
  NavScreenMuscles,
  NavScreenOnerms,
  NavScreenSetupEquipment,
  NavScreenSetupPlates,
  NavScreenProgramSelect,
  NavScreenProgramPreview,
  NavScreenUnits,
  NavScreenFirst,
} from "./screens/NavScreenProgram";
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
import { NavHeader } from "./NavHeader";

const HomeStack = createStackNavigator<IHomeStackParamList>();
const ProgramStack = createStackNavigator<IProgramStackParamList>();
const WorkoutStack = createStackNavigator<IWorkoutStackParamList>();
const GraphsStack = createStackNavigator<IGraphsStackParamList>();
const MeStack = createStackNavigator<IMeStackParamList>();
const Tab = createBottomTabNavigator<IRootTabParamList>();

const stackScreenOptions = {
  header: NavHeader,
  animationEnabled: false,
  cardStyle: { flex: 1, overflow: "hidden" as const },
};

function HomeStackScreen(): JSX.Element {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions}>
      <HomeStack.Screen name="main" component={NavScreenMain} />
    </HomeStack.Navigator>
  );
}

function ProgramStackScreen(props: { initialScreen?: keyof IProgramStackParamList }): JSX.Element {
  return (
    <ProgramStack.Navigator screenOptions={stackScreenOptions} initialRouteName={props.initialScreen}>
      <ProgramStack.Screen name="programs" component={NavScreenPrograms} />
      <ProgramStack.Screen name="editProgram" component={NavScreenEditProgram} />
      <ProgramStack.Screen name="editProgramExercise" component={NavScreenEditProgramExercise} />
      <ProgramStack.Screen name="muscles" component={NavScreenMuscles} />
      <ProgramStack.Screen name="onerms" component={NavScreenOnerms} />
      <ProgramStack.Screen name="setupequipment" component={NavScreenSetupEquipment} />
      <ProgramStack.Screen name="setupplates" component={NavScreenSetupPlates} />
      <ProgramStack.Screen name="programselect" component={NavScreenProgramSelect} />
      <ProgramStack.Screen name="programPreview" component={NavScreenProgramPreview} />
      <ProgramStack.Screen name="units" component={NavScreenUnits} />
      <ProgramStack.Screen name="first" component={NavScreenFirst} />
    </ProgramStack.Navigator>
  );
}

function WorkoutStackScreen(): JSX.Element {
  return (
    <WorkoutStack.Navigator screenOptions={stackScreenOptions}>
      <WorkoutStack.Screen name="progress" component={NavScreenProgress} />
      <WorkoutStack.Screen name="finishDay" component={NavScreenFinishDay} />
      <WorkoutStack.Screen name="subscription" component={NavScreenSubscription} />
    </WorkoutStack.Navigator>
  );
}

function GraphsStackScreen(): JSX.Element {
  return (
    <GraphsStack.Navigator screenOptions={stackScreenOptions}>
      <GraphsStack.Screen name="graphs" component={NavScreenGraphs} />
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
    </MeStack.Navigator>
  );
}

const tabScreenOptions = { headerShown: false };

const tabNameMap: Record<string, keyof IRootTabParamList> = {
  home: "homeTab",
  program: "programTab",
  workout: "workoutTab",
  graphs: "graphsTab",
  me: "meTab",
};

function getInitialProgramScreen(
  initialScreen: IScreen | undefined,
  initialTab: keyof IRootTabParamList | undefined
): keyof IProgramStackParamList | undefined {
  if (initialTab !== "programTab" || !initialScreen) {
    return undefined;
  }
  return initialScreen as keyof IProgramStackParamList;
}

export function AppNavigator(props: { initialScreen?: IScreen }): JSX.Element {
  const { initialScreen } = props;
  const initialTab = initialScreen ? tabNameMap[Screen_tab(initialScreen)] : undefined;
  const initialProgramScreen = getInitialProgramScreen(initialScreen, initialTab);
  return (
    <Tab.Navigator
      screenOptions={tabScreenOptions}
      initialRouteName={initialTab}
      tabBar={(tabProps) => <Footer2Wrapper {...tabProps} />}
    >
      <Tab.Screen name="homeTab" component={HomeStackScreen} />
      <Tab.Screen name="programTab">{() => <ProgramStackScreen initialScreen={initialProgramScreen} />}</Tab.Screen>
      <Tab.Screen name="workoutTab" component={WorkoutStackScreen} />
      <Tab.Screen name="graphsTab" component={GraphsStackScreen} />
      <Tab.Screen name="meTab" component={MeStackScreen} />
    </Tab.Navigator>
  );
}
