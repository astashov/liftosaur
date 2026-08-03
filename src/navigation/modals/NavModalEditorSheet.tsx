import { JSX, useEffect, useState } from "react";
import { Keyboard, Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { TransparentModal } from "../TransparentModal";
import { CustomKeyboardProvider } from "../CustomKeyboardContext";
import { LiftoEditor } from "../../components/primitives/liftoEditor";
import { ILiftoEditorController, useLiftoEditorController } from "../../components/liftoEditorController";
import { Text } from "../../components/primitives/text";
import { IconArrowRight } from "../../components/icons/iconArrowRight";
import { IconUiMode } from "../../components/icons/iconUiMode";
import { IconCloseCircleOutline } from "../../components/icons/iconCloseCircleOutline";
import { Tailwind_colors } from "../../utils/tailwindConfig";

const sampleText = `# Week 1
## Day 1
Squat / 5x5 / 100kg / progress: lp(5kg)
Bench Press, Barbell / 3x8-10 @8 60s / 80% / warmup: 2x5 45%, 1x3 60%
// A line comment
Deadlift[1-3] / 1x5 / 150kg+ / update: custom() {~ weights += 2.5kg ~}
`;

// Pills wear the syntax color of what they insert, so the chip previews the code (design).
function pillHue(label: string): { fg: string; bd: string; bg: string } {
  const colors = Tailwind_colors();
  if (/weight|RPE/i.test(label)) {
    return { fg: colors.green["800"], bd: colors.green["200"], bg: colors.green["50"] };
  }
  if (/timer/i.test(label)) {
    return { fg: colors.purple["800"], bd: colors.purple["200"], bg: colors.purple["50"] };
  }
  if (/auto|state var/i.test(label)) {
    return { fg: colors.blue["800"], bd: colors.blue["200"], bg: colors.blue["50"] };
  }
  if (/set group|sets|reps|warmup/i.test(label)) {
    return { fg: colors.yellow["800"], bd: colors.yellow["200"], bg: colors.yellow["50"] };
  }
  if (/progress|update/i.test(label)) {
    return { fg: colors.purple["700"], bd: colors.purple["200"], bg: colors.purple["50"] };
  }
  return { fg: colors.darkgray["800"], bd: colors.lightgray["300"], bg: colors.lightgray["50"] };
}

function hintForContext(controller: ILiftoEditorController): string | undefined {
  const levels = controller.context?.levels ?? [];
  const level = levels[controller.activeLevelIndex];
  if (level == null) {
    return undefined;
  }
  if (level.nodeName === "ExerciseExpression") {
    return "Exercise: one movement — its warmups, set groups and progression.";
  }
  if (level.nodeName === "ExerciseProperty" || level.nodeName === "FunctionExpression") {
    return "Property: progression, warmups or update logic for this exercise.";
  }
  return "Set group: sets × reps, then weight. % here resolve against your 1RM.";
}

function SheetCrumbs(props: { controller: ILiftoEditorController }): JSX.Element {
  const { controller } = props;
  const levels = controller.context?.levels ?? [];
  const accent = Tailwind_colors().purple["500"];
  if (levels.length === 0) {
    return <Text className="text-sm text-text-secondary">Tap a token to focus</Text>;
  }
  return (
    <View className="flex-row flex-wrap items-center">
      {levels.map((level, i) => (
        <View key={`${level.nodeName}-${level.start}`} className="flex-row items-center">
          {i > 0 ? <Text className="text-xs text-text-secondary px-1">/</Text> : null}
          <Pressable onPress={() => controller.selectLevel(i)}>
            <Text
              className={`text-sm ${i === controller.activeLevelIndex ? "font-bold text-text-primary" : "text-text-secondary"}`}
              style={
                i === controller.activeLevelIndex ? { borderBottomWidth: 1.5, borderBottomColor: accent } : undefined
              }
            >
              {level.label}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// Must render inside the sheet's own CustomKeyboardProvider: native-stack modal screens sit
// above the app root in the native hierarchy, so the root keyboard host would draw BEHIND
// the sheet (same reason NavModalEditTarget nests a provider).
// Android is adjustResize (the window shrinks under the IME), so only iOS needs manual
// keyboard avoidance for the bottom-anchored sheet.
function useSystemKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== "ios") {
      return;
    }
    const showSub = Keyboard.addListener("keyboardWillShow", (e) => setHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener("keyboardWillHide", () => setHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  return height;
}

function EditorSheetBody(props: { onClose: () => void }): JSX.Element {
  const controller = useLiftoEditorController(sampleText, { showKeypadNav: false });
  const [hintDismissed, setHintDismissed] = useState(false);
  const hint = hintForContext(controller);
  const accent = Tailwind_colors().purple["500"];
  const yellow = Tailwind_colors().yellow;
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const systemKeyboardHeight = useSystemKeyboardHeight();
  const isFreeform = controller.mode === "freeform";

  return (
    // Auto-height: the sheet hugs the content; the nested fit-content keyboard host adds
    // inline space below when the keypad opens, growing the sheet.
    <View>
      <View>
        <View className="flex-row items-center gap-2 px-4 pb-2 border-b border-border-neutral">
          <View className="flex-1">
            <Text className="text-xs font-bold text-text-secondary">WK 1 · DAY 1</Text>
            {isFreeform ? (
              <Text className="text-sm text-text-secondary">Editing as text</Text>
            ) : (
              <SheetCrumbs controller={controller} />
            )}
          </View>
          {!isFreeform ? (
            <>
              <Pressable className="p-2" onPress={() => controller.walkFocus(-1)}>
                <View style={{ transform: [{ rotate: "180deg" }] }}>
                  <IconArrowRight />
                </View>
              </Pressable>
              <Pressable className="p-2" onPress={() => controller.walkFocus(1)}>
                <IconArrowRight />
              </Pressable>
            </>
          ) : (
            <Pressable className="p-2" onPress={controller.switchToStructured}>
              <IconUiMode />
            </Pressable>
          )}
          <Pressable onPress={props.onClose}>
            <Text className="text-base font-bold" style={{ color: accent }}>
              Done
            </Text>
          </Pressable>
        </View>
        {!isFreeform ? (
          <View className="flex-row items-center border-b border-border-neutral">
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} className="flex-1">
              <View className="flex-row items-center gap-2 px-3 py-2">
                {controller.pills.map((pill) => {
                  const hue = pillHue(pill.label);
                  return (
                    <Pressable
                      key={pill.label}
                      className="rounded-lg px-3 py-1.5"
                      style={{ backgroundColor: hue.bg, borderWidth: 1, borderColor: hue.bd }}
                      onPress={() => controller.insertPill(pill.insertAt, pill.insertText)}
                    >
                      <Text className="text-xs font-bold" style={{ color: hue.fg }}>
                        {pill.label}
                      </Text>
                    </Pressable>
                  );
                })}
                {controller.pills.length === 0 ? (
                  <Text className="text-xs text-text-secondary py-1.5">Tap a token to see actions</Text>
                ) : null}
              </View>
            </ScrollView>
            <View className="flex-row items-center border-l border-border-neutral">
              {(controller.context?.levels ?? []).length > 0 ? (
                <Pressable className="pl-2 py-1" onPress={controller.removeFocused}>
                  <IconCloseCircleOutline />
                </Pressable>
              ) : null}
              <View className="px-2 py-1">
                <Text className="text-base font-bold text-text-secondary">⋮</Text>
              </View>
            </View>
          </View>
        ) : null}
        {!isFreeform && hint != null && !hintDismissed ? (
          <View
            className="flex-row items-center gap-2 px-3 py-2"
            style={{ backgroundColor: yellow["50"], borderBottomWidth: 1, borderBottomColor: yellow["200"] }}
          >
            <Text className="text-xs font-semibold flex-1" style={{ color: yellow["900"] }} numberOfLines={1}>
              {hint}
            </Text>
            <Pressable
              className="items-center justify-center rounded-md"
              style={{ width: 18, height: 18, backgroundColor: "#fff", borderWidth: 1, borderColor: yellow["200"] }}
              onPress={() => setHintDismissed(true)}
            >
              <Text className="text-xs font-bold" style={{ color: yellow["800"] }}>
                ✕
              </Text>
            </Pressable>
          </View>
        ) : null}
        <ScrollView style={{ maxHeight: windowHeight * 0.45 }}>
          <View className="px-4 py-3">
            <LiftoEditor {...controller.editorProps} />
          </View>
        </ScrollView>
        {systemKeyboardHeight > 0 ? (
          <View style={{ height: Math.max(0, systemKeyboardHeight - insets.bottom) }} />
        ) : null}
      </View>
    </View>
  );
}

export function NavModalEditorSheet(): JSX.Element {
  const navigation = useNavigation();

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <TransparentModal onClose={onClose} fitContent={true}>
        <CustomKeyboardProvider applySafeAreaBottom={false} fitContent={true} noShadow={true}>
          <EditorSheetBody onClose={onClose} />
        </CustomKeyboardProvider>
      </TransparentModal>
    </SheetScreenContainer>
  );
}
