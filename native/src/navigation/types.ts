import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type IRootStackParamList = Record<string, object | undefined>;
export type IRootNavigation = NativeStackNavigationProp<IRootStackParamList>;
