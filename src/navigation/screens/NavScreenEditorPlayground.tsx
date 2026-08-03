import { JSX, useMemo, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LiftoEditor } from "../../components/primitives/liftoEditor";
import {
  ILiftoEditorHandle,
  INumericToken,
  LiftoEditorBrain_numericTokens,
  LiftoEditorBrain_stepToken,
} from "../../components/primitives/liftoEditorBrain";
import { Text } from "../../components/primitives/text";

const sampleText = `# Week 1
## Day 1
Squat / 5x5 / 100kg / progress: lp(5kg)
Bench Press, Barbell / 3x8-10 @8 60s / 80% / warmup: 2x5 45%, 1x3 60%
// A line comment
Deadlift[1-3] / 1x5 / 150kg+ / update: custom() {~ weights += 2.5kg ~}
`;

function PanelButton(props: { label: string; disabled?: boolean; onPress: () => void }): JSX.Element {
  return (
    <Pressable
      className={`px-4 py-2 mx-1 rounded-md border border-border-neutral bg-background-subtle ${
        props.disabled ? "opacity-30" : ""
      }`}
      disabled={props.disabled}
      onPress={props.onPress}
    >
      <Text className="text-base font-semibold text-text-primary">{props.label}</Text>
    </Pressable>
  );
}

export function NavScreenEditorPlayground(): JSX.Element {
  const [status, setStatus] = useState("ready");
  const [text, setText] = useState(sampleText);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const handleRef = useRef<ILiftoEditorHandle | undefined>(undefined);
  const insets = useSafeAreaInsets();

  const tokens = useMemo(() => LiftoEditorBrain_numericTokens(text), [text]);
  const currentIndex = tokens.findIndex((t) => selection.start >= t.start && selection.start <= t.end);
  const current: INumericToken | undefined = tokens[currentIndex];

  function goTo(index: number): void {
    if (tokens.length === 0) {
      return;
    }
    const token = tokens[(index + tokens.length) % tokens.length];
    handleRef.current?.setSelection(token.start, token.end);
    setSelection({ start: token.start, end: token.end });
  }

  function goPrev(): void {
    if (currentIndex >= 0) {
      goTo(currentIndex - 1);
    } else {
      const before = tokens.filter((t) => t.end < selection.start);
      goTo(before.length > 0 ? tokens.indexOf(before[before.length - 1]) : tokens.length - 1);
    }
  }

  function goNext(): void {
    if (currentIndex >= 0) {
      goTo(currentIndex + 1);
    } else {
      const afterIndex = tokens.findIndex((t) => t.start > selection.start);
      goTo(afterIndex >= 0 ? afterIndex : 0);
    }
  }

  function step(direction: 1 | -1): void {
    if (current == null) {
      return;
    }
    const newText = LiftoEditorBrain_stepToken(current, direction);
    if (newText == null) {
      return;
    }
    handleRef.current?.replaceRange(current.start, current.end, newText);
    handleRef.current?.setSelection(current.start, current.start + newText.length);
    setSelection({ start: current.start, end: current.start + newText.length });
  }

  return (
    <View className="flex-1 bg-background-default">
      <View className="m-2 border border-border-neutral rounded-md overflow-hidden">
        <LiftoEditor
          initialText={sampleText}
          autoHeight={true}
          handleRef={handleRef}
          onTextChange={(newText) => {
            setText(newText);
            setStatus(`len ${newText.length}`);
          }}
          onSelectionChange={(start, end) => {
            setSelection({ start, end });
            setStatus(`sel ${start}-${end}`);
          }}
        />
      </View>
      <View className="flex-row items-center justify-center mx-2 py-2">
        <PanelButton label="‹" disabled={tokens.length === 0} onPress={goPrev} />
        <PanelButton label="›" disabled={tokens.length === 0} onPress={goNext} />
        <View className="items-center px-3" style={{ minWidth: 96 }}>
          <Text className="text-base font-semibold text-text-primary">{current?.text ?? "—"}</Text>
          <Text className="text-xs text-text-secondary">{current?.kind ?? "no number"}</Text>
        </View>
        <PanelButton label="−" disabled={current == null} onPress={() => step(-1)} />
        <PanelButton label="+" disabled={current == null} onPress={() => step(1)} />
      </View>
      <View className="mx-2 mb-2 border border-border-neutral rounded-md" style={{ height: 160 }}>
        <TextInput
          multiline={true}
          defaultValue={sampleText}
          autoCorrect={false}
          autoCapitalize="none"
          style={{ flex: 1, fontFamily: "Menlo", fontSize: 14, padding: 4 }}
        />
      </View>
      <View className="flex-1" />
      <View className="px-4 py-2 border-t border-border-neutral" style={{ paddingBottom: insets.bottom + 8 }}>
        <Text className="text-xs text-text-secondary">{status}</Text>
      </View>
    </View>
  );
}
