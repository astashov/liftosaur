import type React from "react";
import { MigratedScreens_register } from "../navigation/migratedScreens";
import { HomeScreen } from "./HomeScreen";

MigratedScreens_register("main", HomeScreen as React.ComponentType<{ route: { name: string; params?: unknown } }>);
