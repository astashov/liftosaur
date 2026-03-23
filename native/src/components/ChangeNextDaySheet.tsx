import React, { useCallback } from "react";
import { View, Text, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { LayoutChangeEvent } from "react-native";
import { Program_evaluate, Program_getProgramDay, Program_numberOfDays, emptyProgramId } from "@shared/models/program";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStoreState } from "../context/StoreContext";
import { useWebViewPool } from "../screens/WebViewPool";

export function ChangeNextDayScreen(): React.ReactElement {
  const navigation = useNavigation();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const appState = useStoreState();
  const pool = useWebViewPool();

  const onContentLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const contentHeight = e.nativeEvent.layout.height;
      const headerHeight = 56;
      const fraction = Math.min((contentHeight + headerHeight + insets.bottom) / screenHeight, 0.9);
      navigation.setOptions({ sheetAllowedDetents: [fraction, 1.0] });
    },
    [screenHeight, navigation, insets.bottom]
  );
  const settings = appState.storage.settings;
  const allPrograms = appState.storage.programs;
  const currentProgramId = appState.storage.currentProgramId;

  const onSelect = (programId: string, day: number): void => {
    pool.sendCommand({ type: "command", command: "selectProgram", programId, day });
    navigation.goBack();
  };

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background-default" onLayout={onContentLayout}>
      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-4">
        <Pressable className="py-3.5 border-b border-border-neutral" onPress={() => onSelect(emptyProgramId, 1)}>
          <Text className="text-base text-text-primary">Go without a program</Text>
        </Pressable>

        {allPrograms.map((program) => {
          let evaluated;
          try {
            evaluated = Program_evaluate(program, settings);
          } catch {
            return null;
          }
          const numDays = Program_numberOfDays(evaluated);
          const isCurrentProgram = program.id === currentProgramId;

          return (
            <View key={program.id}>
              <Text
                className={`text-sm font-semibold mt-4 mb-1 ${
                  isCurrentProgram ? "text-text-purple" : "text-text-primary"
                }`}
              >
                {program.name}
              </Text>
              {Array.from({ length: numDays }, (_, i) => {
                const day = i + 1;
                const programDay = Program_getProgramDay(evaluated, day);
                const dayName = programDay?.name ?? `Day ${day}`;
                return (
                  <Pressable
                    key={day}
                    className="py-3 pl-3 border-b border-border-neutral"
                    onPress={() => onSelect(program.id, day)}
                  >
                    <Text className="text-base text-text-primary">{dayName}</Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
