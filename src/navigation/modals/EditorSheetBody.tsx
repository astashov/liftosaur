import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, Pressable, ScrollView, View } from "react-native";
import { useAppState } from "../StateContext";
import { PlannerEditorView } from "../../pages/planner/components/plannerEditorView";
import { PlannerSyntaxError } from "../../pages/planner/plannerExerciseEvaluator";
import { Dialog_confirm } from "../../utils/dialog";
import { Button } from "../../components/button";
import { Text } from "../../components/primitives/text";
import { FadeScrollView } from "../../components/fadeScrollView";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import type { IEditorSheetBodyProps, IEditorSheetInstanceOption } from "./editorSheetTypes";

// Web body: a plain CodeMirror editor — no pills, hints or breadcrumbs. With a physical
// keyboard the structured touch UI adds nothing, and CodeMirror brings autocomplete and
// inline syntax diagnostics of its own.
export function EditorSheetBody(props: IEditorSheetBodyProps): JSX.Element {
  const { state } = useAppState();
  const [text, setText] = useState(props.initialText);
  const [liveError, setLiveError] = useState<{ message: string; from?: number; to?: number } | undefined>(undefined);
  const validateTextRef = useRef(props.validateText);
  validateTextRef.current = props.validateText;
  // Debounced: validation evaluates the whole program, too heavy per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setLiveError(validateTextRef.current?.(text)), 300);
    return () => clearTimeout(timer);
  }, [text]);
  // Memoized so PlannerEditorView's [error] effect doesn't relint on every render.
  const error = useMemo(
    () =>
      liveError != null
        ? new PlannerSyntaxError(liveError.message, 0, 0, liveError.from ?? 0, liveError.to ?? 0)
        : undefined,
    [liveError]
  );
  const accent = Tailwind_semantic().text.purple;
  const railRef = useRef<ScrollView>(null);
  // Only on the initial layout: the body remounts on instance switch, and reacting to later
  // re-layouts would yank the rail away from wherever the user scrolled it.
  const hasAutoScrolledRail = useRef(false);
  const scrollSelectedIntoView = (event: LayoutChangeEvent): void => {
    if (hasAutoScrolledRail.current) {
      return;
    }
    hasAutoScrolledRail.current = true;
    const x = event.nativeEvent.layout.x;
    requestAnimationFrame(() => railRef.current?.scrollTo({ x: Math.max(0, x - 24), animated: false }));
  };

  const selectInstance = async (instance: IEditorSheetInstanceOption): Promise<void> => {
    if (instance.isSelected) {
      return;
    }
    if (text.trim() !== props.initialText.trim()) {
      if (!(await Dialog_confirm("Discard unsaved changes to this exercise?"))) {
        return;
      }
    }
    props.onSelectInstance(instance);
  };

  return (
    <View testID="editor-sheet" className="px-4 pb-4">
      {/* pr-10 clears the sheet container's absolutely-positioned close button. */}
      <View className="flex-row items-center gap-2 pb-2 pr-10">
        <View className="flex-1">
          {props.instances.length > 1 ? (
            <FadeScrollView contentClassName="gap-1" scrollRef={railRef}>
              {props.instances.map((instance) => (
                <Pressable
                  key={`${instance.dayData.week}-${instance.dayData.dayInWeek}`}
                  testID={`editor-sheet-instance-${instance.dayData.week}-${instance.dayData.dayInWeek}`}
                  onLayout={instance.isSelected ? scrollSelectedIntoView : undefined}
                  className={`px-2 py-0.5 rounded border ${
                    instance.isSelected
                      ? "bg-background-default border-button-primarybackground"
                      : "bg-background-subtle border-background-subtle"
                  }`}
                  onPress={() => selectInstance(instance)}
                >
                  <Text
                    className="text-xs font-bold text-text-secondary"
                    style={instance.isSelected ? { color: accent } : undefined}
                  >
                    {instance.label}
                  </Text>
                </Pressable>
              ))}
            </FadeScrollView>
          ) : (
            <Text className="text-xs font-bold text-text-secondary">{props.headerLabel}</Text>
          )}
        </View>
        <Button
          name="editor-sheet-save"
          kind="purple"
          buttonSize="sm"
          className="text-xs"
          onPress={() => props.onDone(text)}
        >
          Save
        </Button>
      </View>
      <PlannerEditorView
        name="editor-sheet"
        redError={true}
        customExercises={state.storage.settings.exercises}
        exerciseFullNames={props.exerciseFullNames}
        error={error}
        value={props.initialText}
        onChange={(value) => {
          setText(value);
          props.onTextChange?.(value);
        }}
      />
    </View>
  );
}
