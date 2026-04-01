import { createNavigationContainerRef } from "@react-navigation/native";
import type { IRootTabParamList } from "./types";

export const navigationRef = createNavigationContainerRef<IRootTabParamList>();
