import type React from "react";
import { MigratedScreens_register } from "../navigation/migratedScreens";
import { HomeScreen } from "./HomeScreen";
import { WorkoutScreen } from "./WorkoutScreen";

type IScreenComponent = React.ComponentType<{ route: { name: string; params?: unknown } }>;

MigratedScreens_register("main", HomeScreen as IScreenComponent);
MigratedScreens_register("progress", WorkoutScreen as IScreenComponent);
