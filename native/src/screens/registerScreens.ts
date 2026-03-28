import type React from "react";
import { MigratedScreens_register } from "../navigation/migratedScreens";
import { NativeScreenHome } from "./NativeScreenHome";
import { NativeScreenWorkout } from "./NativeScreenWorkout";
import { NativeScreenGraphs } from "./NativeScreenGraphs";
import { NativeScreenSettings } from "./NativeScreenSettings";
import { NativeScreenFirst } from "./NativeScreenFirst";
import { NativeScreenUnitSelector } from "./NativeScreenUnitSelector";
import { NativeScreenSetupEquipment } from "./NativeScreenSetupEquipment";
import { NativeScreenProgramSelect } from "./NativeScreenProgramSelect";
import { NativeScreenPrograms } from "./NativeScreenPrograms";

type IScreenComponent = React.ComponentType<{ route: { name: string; params?: unknown } }>;

MigratedScreens_register("main", NativeScreenHome as IScreenComponent);
MigratedScreens_register("progress", NativeScreenWorkout as IScreenComponent);
MigratedScreens_register("graphs", NativeScreenGraphs as IScreenComponent);
MigratedScreens_register("settings", NativeScreenSettings as IScreenComponent);
MigratedScreens_register("first", NativeScreenFirst as IScreenComponent);
MigratedScreens_register("units", NativeScreenUnitSelector as IScreenComponent);
MigratedScreens_register("setupequipment", NativeScreenSetupEquipment as IScreenComponent);
MigratedScreens_register("programselect", NativeScreenProgramSelect as IScreenComponent);
MigratedScreens_register("programs", NativeScreenPrograms as IScreenComponent);
