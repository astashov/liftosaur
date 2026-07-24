import { createNavigationContainerRef } from "@react-navigation/native";
import type { IRootStackParamList } from "./types";

export const navigationRef = createNavigationContainerRef<IRootStackParamList>();
