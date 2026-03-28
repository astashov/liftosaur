import type React from "react";
import { MigratedScreens_register } from "../navigation/migratedScreens";
import { HomeScreen } from "./HomeScreen";
import { WorkoutScreen } from "./WorkoutScreen";
import { GraphsScreen } from "./GraphsScreen";
import { SettingsScreen } from "./SettingsScreen";
import { FirstScreen } from "./FirstScreen";
import { UnitSelectorScreen } from "./UnitSelectorScreen";
import { SetupEquipmentScreen } from "./SetupEquipmentScreen";
import { ProgramSelectScreen } from "./ProgramSelectScreen";
import { ProgramsScreen } from "./ProgramsScreen";

type IScreenComponent = React.ComponentType<{ route: { name: string; params?: unknown } }>;

MigratedScreens_register("main", HomeScreen as IScreenComponent);
MigratedScreens_register("progress", WorkoutScreen as IScreenComponent);
MigratedScreens_register("graphs", GraphsScreen as IScreenComponent);
MigratedScreens_register("settings", SettingsScreen as IScreenComponent);
MigratedScreens_register("first", FirstScreen as IScreenComponent);
MigratedScreens_register("units", UnitSelectorScreen as IScreenComponent);
MigratedScreens_register("setupequipment", SetupEquipmentScreen as IScreenComponent);
MigratedScreens_register("programselect", ProgramSelectScreen as IScreenComponent);
MigratedScreens_register("programs", ProgramsScreen as IScreenComponent);
