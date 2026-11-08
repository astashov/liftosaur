import { JSX, ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "../primitives/text";
import { TextInput } from "../primitives/textInput";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { useRem } from "../../utils/useRem";
import { IconArrowRight } from "../icons/iconArrowRight";
import { ActionMenu } from "../actionMenu";
import {
  LiftographPalette_entry,
  LiftographPalette_isHex,
  LiftographPalette_names,
} from "../../liftograph/liftographPalette";
import { LiftographWidgetModel_splitOptions } from "../../liftograph/liftographWidgetModel";

export interface IDashboardFormChip<T> {
  value: T;
  label: string;
}

function Chip(props: { testID: string; label: string; isSelected: boolean; onPress: () => void }): JSX.Element {
  return (
    <Pressable
      testID={props.testID}
      data-testid={props.testID}
      className="px-3 py-1 border rounded-full"
      style={{
        borderRadius: 999,
        backgroundColor: props.isSelected ? Tailwind_semantic().background.cardpurpleselected : "transparent",
        borderColor: props.isSelected ? Tailwind_semantic().border.cardpurple : Tailwind_semantic().border.neutral,
      }}
      onPress={props.onPress}
    >
      <Text className={`text-sm ${props.isSelected ? "text-text-purple font-semibold" : ""}`}>{props.label}</Text>
    </Pressable>
  );
}

export function DashboardFormChips<T>(props: {
  testID: string;
  options: IDashboardFormChip<T>[];
  selected: T;
  onSelect: (value: T) => void;
}): JSX.Element {
  return (
    <View className="flex-row flex-wrap gap-2">
      {props.options.map((option) => (
        <Chip
          key={option.label}
          testID={`${props.testID}-${option.label}`}
          label={option.label}
          isSelected={option.value === props.selected}
          onPress={() => props.onSelect(option.value)}
        />
      ))}
    </View>
  );
}

const VISIBLE_CHOICES = 10;

export function DashboardFormChoice(props: {
  testID: string;
  title: string;
  options: string[];
  value: string | undefined;
  anyLabel?: string;
  onChange: (value: string | undefined) => void;
}): JSX.Element {
  const { visible, rest } = LiftographWidgetModel_splitOptions(props.options, props.value, VISIBLE_CHOICES);
  const anyLabel = props.anyLabel;
  return (
    <View className="flex-row flex-wrap gap-2">
      {anyLabel != null ? (
        <Chip
          testID={`${props.testID}-${anyLabel}`}
          label={anyLabel}
          isSelected={props.value == null}
          onPress={() => props.onChange(undefined)}
        />
      ) : null}
      {visible.map((option) => (
        <Chip
          key={option}
          testID={`${props.testID}-${option}`}
          label={option}
          isSelected={option === props.value}
          onPress={() => props.onChange(option)}
        />
      ))}
      {rest.length > 0 ? (
        <ActionMenu
          title={props.title}
          actions={rest.map((option) => ({ label: option, onPress: () => props.onChange(option) }))}
          renderTrigger={(open) => (
            <Chip testID={`${props.testID}-more`} label={`… ${rest.length} more`} isSelected={false} onPress={open} />
          )}
        />
      ) : null}
    </View>
  );
}

export function DashboardFormColors(props: {
  testID: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}): JSX.Element {
  const size = useRem() * 1.75;
  const isCustom = props.value != null && LiftographPalette_names.every((name) => name !== props.value);
  const [isCustomOpen, setIsCustomOpen] = useState(isCustom);
  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap items-center gap-3">
        <Chip
          testID={`${props.testID}-auto`}
          label="Auto"
          isSelected={props.value == null && !isCustomOpen}
          onPress={() => {
            setIsCustomOpen(false);
            props.onChange(undefined);
          }}
        />
        {LiftographPalette_names.map((name, index) => {
          const isSelected = props.value === name;
          return (
            <Pressable
              key={name}
              testID={`${props.testID}-${name}`}
              data-testid={`${props.testID}-${name}`}
              accessibilityLabel={name}
              onPress={() => {
                setIsCustomOpen(false);
                props.onChange(name);
              }}
              style={{
                width: size,
                height: size,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: isSelected ? Tailwind_semantic().text.primary : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: size - 8,
                  height: size - 8,
                  borderRadius: 999,
                  backgroundColor: LiftographPalette_entry(name, index).stroke,
                }}
              />
            </Pressable>
          );
        })}
        <Pressable
          testID={`${props.testID}-custom`}
          data-testid={`${props.testID}-custom`}
          className="flex-row items-center gap-2 px-3 py-1 border rounded-full"
          style={{
            borderRadius: 999,
            backgroundColor: isCustomOpen ? Tailwind_semantic().background.cardpurpleselected : "transparent",
            borderColor: isCustomOpen ? Tailwind_semantic().border.cardpurple : Tailwind_semantic().border.neutral,
          }}
          onPress={() => setIsCustomOpen(true)}
        >
          {isCustom && props.value != null && LiftographPalette_isHex(props.value) ? (
            <View style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: props.value }} />
          ) : null}
          <Text className={`text-sm ${isCustomOpen ? "text-text-purple font-semibold" : ""}`}>Custom</Text>
        </Pressable>
      </View>
      {isCustomOpen ? (
        <DashboardFormInput
          testID={`${props.testID}-hex`}
          value={isCustom ? props.value : undefined}
          placeholder="Hex color, like #8356F6"
          onChange={props.onChange}
        />
      ) : null}
    </View>
  );
}

export function DashboardFormField(props: { label: string; hint?: string; children: ReactNode }): JSX.Element {
  return (
    <View className="py-2">
      <Text className="pb-1 text-xs text-text-secondary">{props.label}</Text>
      {props.children}
      {props.hint != null && props.hint !== "" ? (
        <Text className="pt-1 text-xs text-text-secondary">{props.hint}</Text>
      ) : null}
    </View>
  );
}

export function DashboardFormInput(props: {
  testID: string;
  value: string | undefined;
  placeholder?: string;
  onChange: (value: string | undefined) => void;
}): JSX.Element {
  return (
    <TextInput
      testID={props.testID}
      data-testid={props.testID}
      className="px-3 py-2 text-base border rounded-lg border-border-neutral bg-background-default text-text-primary"
      defaultValue={props.value ?? ""}
      placeholder={props.placeholder}
      autoCapitalize="none"
      autoCorrect={false}
      onChangeText={(text) => props.onChange(text.trim() === "" ? undefined : text.trim())}
    />
  );
}

const CHEVRON_WIDTH = 10;
const CHEVRON_HEIGHT = 17;

export function DashboardFormChevron(props: { direction: "forward" | "back"; color?: string }): JSX.Element {
  const scale = useRem() / 16;
  return (
    <View style={props.direction === "back" ? { transform: [{ scaleX: -1 }] } : undefined}>
      <IconArrowRight
        width={CHEVRON_WIDTH * scale}
        height={CHEVRON_HEIGHT * scale}
        color={props.color ?? Tailwind_semantic().icon.neutral}
      />
    </View>
  );
}

export function DashboardFormRaw(props: { text: string; onEditAsText: () => void }): JSX.Element {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="flex-1 font-mono text-sm" numberOfLines={3}>
        {props.text}
      </Text>
      <Pressable testID="dashboard-widget-edit-as-text" className="px-2 py-1" onPress={props.onEditAsText}>
        <Text className="text-sm text-text-link">Edit as text</Text>
      </Pressable>
    </View>
  );
}
