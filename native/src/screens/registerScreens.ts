import type React from "react";
import { MigratedScreens_register } from "../navigation/migratedScreens";
import { HomeScreen } from "./HomeScreen";
import { WorkoutScreen } from "./WorkoutScreen";
import { GraphsScreen } from "./GraphsScreen";
import { SettingsScreen } from "./SettingsScreen";

type IScreenComponent = React.ComponentType<{ route: { name: string; params?: unknown } }>;

MigratedScreens_register("main", HomeScreen as IScreenComponent);
MigratedScreens_register("progress", WorkoutScreen as IScreenComponent);
MigratedScreens_register("graphs", GraphsScreen as IScreenComponent);
MigratedScreens_register("settings", SettingsScreen as IScreenComponent);
