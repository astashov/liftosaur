import { JSX } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { LiftoEditor } from "../../components/primitives/liftoEditor";
import { useLiftoEditorController } from "../../components/liftoEditorController";
import { Text } from "../../components/primitives/text";
import { IRootStackParamList } from "../types";

const sampleText = `# Week 1
## Day 1
Squat / 5x5 / 100kg / progress: lp(5kg)
Bench Press, Barbell / 3x8-10 @8 60s / 80% / warmup: 2x5 45%, 1x3 60%
// A line comment
Deadlift[1-3] / 1x5 / 150kg+ / update: custom() {~ weights += 2.5kg ~}
`;

function Pill(props: { label: string; onPress: () => void; emphasized?: boolean }): JSX.Element {
  return (
    <Pressable
      className={`px-3 py-1 mr-2 mb-2 rounded-full border ${
        props.emphasized ? "border-border-neutral bg-background-subtle" : "border-border-neutral"
      }`}
      onPress={props.onPress}
    >
      <Text className="text-sm text-text-primary">{props.label}</Text>
    </Pressable>
  );
}

export function NavScreenEditorPlayground(): JSX.Element {
  const controller = useLiftoEditorController(sampleText);
  const navigation = useNavigation<NavigationProp<IRootStackParamList>>();
  const insets = useSafeAreaInsets();

  const levels = controller.context?.levels ?? [];

  return (
    <View className="flex-1 bg-background-default">
      <View className="m-2 border border-border-neutral rounded-md overflow-hidden">
        <LiftoEditor {...controller.editorProps} />
      </View>
      {controller.mode === "structured" ? (
        <View className="mx-2">
          {levels.length > 0 ? (
            <View className="flex-row items-center mb-2">
              <Pressable className="px-3 py-1" onPress={() => controller.walkFocus(-1)}>
                <Text className="text-lg font-semibold text-text-primary">‹</Text>
              </Pressable>
              <View className="flex-1 flex-row flex-wrap items-center justify-center">
                {levels.map((level, i) => (
                  <Pressable key={`${level.nodeName}-${level.start}`} onPress={() => controller.selectLevel(i)}>
                    <Text
                      className={`text-sm ${
                        i === controller.activeLevelIndex ? "font-bold text-text-primary" : "text-text-secondary"
                      }`}
                    >
                      {i > 0 ? " › " : ""}
                      {level.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable className="px-3 py-1" onPress={() => controller.walkFocus(1)}>
                <Text className="text-lg font-semibold text-text-primary">›</Text>
              </Pressable>
            </View>
          ) : (
            <Text className="text-sm text-text-secondary mb-2">Tap a number to edit, or use pills below</Text>
          )}
          <View className="flex-row flex-wrap">
            {controller.pills.map((pill) => (
              <Pill
                key={pill.label}
                label={pill.label}
                onPress={() => controller.insertPill(pill.insertAt, pill.insertText)}
              />
            ))}
            <Pill label="Aa Edit as text" emphasized={true} onPress={controller.switchToFreeform} />
            <Pill label="Open in sheet" emphasized={true} onPress={() => navigation.navigate("editorSheetModal")} />
          </View>
        </View>
      ) : (
        <View className="mx-2 flex-row items-center justify-between">
          <Text className="text-sm text-text-secondary">Freeform editing</Text>
          <Pill label="Done" emphasized={true} onPress={controller.switchToStructured} />
        </View>
      )}
      <View className="flex-1" />
      <View className="px-4 py-2 border-t border-border-neutral" style={{ paddingBottom: insets.bottom + 8 }}>
        <Text className="text-xs text-text-secondary">
          {controller.mode === "structured" ? (controller.context?.breadcrumb.join(" › ") ?? "structured") : "freeform"}
        </Text>
      </View>
    </View>
  );
}
