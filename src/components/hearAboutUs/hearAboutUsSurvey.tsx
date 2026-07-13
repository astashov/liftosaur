import { JSX, ReactNode, useRef, useState } from "react";
import { View, Pressable, Image, TextInput, ScrollView, Platform } from "react-native";
import { Text } from "../primitives/text";
import { Button } from "../button";
import { LinkButton } from "../linkButton";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { ImagePreloader_uri } from "../../utils/imagePreloader";
import { IconReddit } from "../icons/iconReddit";
import { IconAi } from "../icons/iconAi";
import { IconDiscord } from "../icons/iconDiscord";
import { IconUser } from "../icons/iconUser";
import { IconDoc } from "../icons/iconDoc";
import { IconGithub } from "../icons/iconGithub";
import { IconSpeaker } from "../icons/iconSpeaker";
import { IconKebab } from "../icons/iconKebab";
import { IconBack } from "../icons/iconBack";
import { IconArrowRight } from "../icons/iconArrowRight";
import { useNavOptions } from "../../navigation/useNavOptions";
import { HEAR_ABOUT_US_OPTIONS, HearAboutUs_option, IHearAboutUsChip, IHearAboutUsSource } from "./hearAboutUsConfig";

export interface IHearAboutUsAnswer {
  source: string;
  detail?: string;
  freeform?: string;
  ts?: number;
}

interface IProps {
  context: "onboarding" | "backfill";
  variant: "screen" | "sheet";
  initialAnswer?: IHearAboutUsAnswer;
  onSelectSource: (source: IHearAboutUsSource) => void;
  onChange: (partial: { detail?: string; freeform?: string }) => void;
  onComplete: (payload: { source: IHearAboutUsSource; detail: string; freeform: string }) => void;
  // Called only when the user skips with NO source chosen. If a source was already picked, the survey
  // finalizes via onComplete instead (we never discard a chosen source).
  onSkip: () => void;
  onMaybeLater?: () => void;
}

// In-content back button for the backfill modal (a formSheet has no real navbar). The onboarding
// screen uses the real navbar instead (see useNavOptions below).
function BackButton({ onPress }: { onPress: () => void }): JSX.Element {
  return (
    <Pressable className="p-2" data-testid="hear-about-us-back" testID="hear-about-us-back" onPress={onPress}>
      <IconBack color={Tailwind_semantic().icon.neutral} />
    </Pressable>
  );
}

function sourceIcon(source: IHearAboutUsSource, color: string): ReactNode {
  const size = 22;
  switch (source) {
    case "reddit":
      return <IconReddit size={size} color={color} secondaryColor={color} />;
    case "ai":
      return <IconAi size={size} color={color} />;
    case "discord":
      return <IconDiscord size={size} color={color} />;
    case "friend":
      return <IconUser size={size} color={color} />;
    case "program":
      return <IconDoc width={size} height={size} color={color} />;
    case "github":
      return <IconGithub width={size} height={size} color={color} />;
    case "ad":
      return <IconSpeaker size={size} color={color} />;
    case "other":
      return <IconKebab color={color} />;
  }
}

function Mascot({ size }: { size: number }): JSX.Element {
  return (
    <Image
      source={{ uri: ImagePreloader_uri("/images/dino-scope.png") }}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel="Liftosaur mascot with a telescope"
    />
  );
}

function SkipButton({ onPress }: { onPress: () => void }): JSX.Element {
  return (
    <LinkButton
      name="hear-about-us-skip"
      testID="hear-about-us-skip"
      className="text-sm ls-hear-about-us-skip p-2"
      onPress={onPress}
    >
      Skip
    </LinkButton>
  );
}

export function HearAboutUsSurvey(props: IProps): JSX.Element {
  const [step, setStep] = useState<1 | 2>(props.initialAnswer?.source ? 2 : 1);
  const [source, setSource] = useState<IHearAboutUsSource | undefined>(
    props.initialAnswer?.source as IHearAboutUsSource | undefined
  );
  const freeformRef = useRef<string>(props.initialAnswer?.freeform ?? "");

  const option = source != null ? HearAboutUs_option(source) : undefined;

  // Tapping a chip is the answer — finalize and advance immediately (like the Step-1 rows), no
  // "selected" state. "Done" is only for the "or type it in" freeform path (detail stays empty).
  const complete = (detail: string): void => {
    if (source == null) {
      return;
    }
    props.onComplete({ source, detail, freeform: freeformRef.current });
  };

  const selectSource = (s: IHearAboutUsSource): void => {
    setSource(s);
    freeformRef.current = "";
    props.onSelectSource(s);
    const opt = HearAboutUs_option(s);
    if (opt?.drill.kind === "none") {
      props.onComplete({ source: s, detail: "", freeform: "" });
    } else {
      setStep(2);
    }
  };

  const skipPress = (): void => {
    if (source != null) {
      complete("");
    } else {
      props.onSkip();
    }
  };

  // Onboarding drives the real navbar (standard back + a "Skip" right button). Step 2's back returns
  // to Step 1 (navOnBack returns false to cancel the pop); Step 1's back falls through to the default
  // pop, returning to the previous onboarding screen. The backfill modal is a formSheet with no
  // navbar, so it renders its own in-content header (below) instead.
  const isScreen = props.variant === "screen";
  const stepTwoTitle = option?.drill != null && option.drill.kind !== "none" ? option.drill.title : undefined;
  const navTitle = step === 1 ? "How'd you hear about us?" : stepTwoTitle;
  useNavOptions(
    isScreen
      ? {
          navTitle,
          navRightButtons: [
            <LinkButton
              key="skip"
              name="hear-about-us-skip"
              testID="hear-about-us-skip"
              className="p-2 text-sm ls-hear-about-us-skip"
              onPress={skipPress}
            >
              Skip
            </LinkButton>,
          ],
          navOnBack: () => {
            if (step === 2) {
              setStep(1);
              return false;
            }
            return true;
          },
        }
      : { navHidden: true }
  );

  if (step === 1) {
    const body = (
      <View className="px-4">
        <View className="flex-row items-center mb-4" style={{ gap: 13 }}>
          <Mascot size={64} />
          <View className="flex-1">
            {!isScreen && (
              <Text className="mb-1 text-xl font-bold text-text-primary">How did you hear about Liftosaur?</Text>
            )}
            <Text className="text-sm font-semibold text-text-secondary">
              It'd really help us out - just a tap or two.
            </Text>
          </View>
          {!isScreen && <SkipButton onPress={skipPress} />}
        </View>
        <View style={{ gap: 8 }}>
          {HEAR_ABOUT_US_OPTIONS.map((opt) => (
            <Pressable
              key={opt.source}
              className="flex-row items-center w-full px-3 py-3 border rounded-2xl bg-background-subtle border-border-neutral ls-hear-about-us-option"
              style={{ minHeight: 56 }}
              data-testid={`hear-about-us-option-${opt.source}`}
              testID={`hear-about-us-option-${opt.source}`}
              onPress={() => selectSource(opt.source)}
            >
              <View
                className="items-center justify-center rounded-xl bg-background-neutral"
                style={{ width: 38, height: 38 }}
              >
                {sourceIcon(opt.source, Tailwind_semantic().text.secondary)}
              </View>
              <Text className="flex-1 ml-3 text-base font-bold text-text-primary">{opt.label}</Text>
              <View className="pl-2">
                <IconArrowRight />
              </View>
            </Pressable>
          ))}
        </View>
        {props.context === "backfill" && (
          <View className="items-center pb-4 mt-5">
            <Pressable
              className="px-4 py-2 ls-hear-about-us-later"
              data-testid="hear-about-us-later"
              testID="hear-about-us-later"
              onPress={() => props.onMaybeLater?.()}
            >
              <Text className="text-sm font-bold text-text-secondary">Maybe later</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
    if (isScreen) {
      return (
        <View className="flex-1">
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {body}
          </ScrollView>
        </View>
      );
    }
    return <View className="pt-6">{body}</View>;
  }

  const drill = option?.drill;

  const body = (
    <View className="px-4">
      {isScreen && (
        <View className="flex-row items-center mb-3" style={{ gap: 11 }}>
          <Mascot size={52} />
          <Text className="text-xs font-bold uppercase text-text-error" style={{ letterSpacing: 1 }}>
            {option?.eyebrow}
          </Text>
        </View>
      )}
      {drill != null && drill.kind !== "none" && (
        <>
          {!isScreen && <Text className="text-2xl font-bold text-text-primary">{drill.title}</Text>}
          <Text className="mt-2 mb-4 text-sm font-semibold text-text-secondary">{drill.sub}</Text>
        </>
      )}
      {drill?.kind === "chips" && (
        <View className="flex-row flex-wrap" style={{ gap: 9 }}>
          {drill.chips.map((chip) => (
            <ChipView key={chip.value} chip={chip} onPress={() => complete(chip.value)} />
          ))}
        </View>
      )}
      {drill?.kind === "chips" && drill.freeformPlaceholder != null && (
        <View className="mt-5">
          <Text className="mb-2 text-xs font-bold uppercase text-text-disabled" style={{ letterSpacing: 0.8 }}>
            Or type it in
          </Text>
          <FreeformInput
            placeholder={drill.freeformPlaceholder}
            defaultValue={freeformRef.current}
            onChangeText={(t) => (freeformRef.current = t)}
            onEndEditing={() => props.onChange({ freeform: freeformRef.current })}
          />
        </View>
      )}
      {drill?.kind === "freeform" && (
        <FreeformInput
          placeholder={drill.placeholder}
          defaultValue={freeformRef.current}
          onChangeText={(t) => (freeformRef.current = t)}
          onEndEditing={() => props.onChange({ freeform: freeformRef.current })}
        />
      )}
    </View>
  );

  const footer = (
    <View className="px-4 pt-3 pb-4 bg-background-default">
      <Button
        name="hear-about-us-done"
        kind="purple"
        buttonSize="lg"
        className="w-full ls-hear-about-us-done"
        testID="hear-about-us-done"
        onPress={() => complete("")}
      >
        Done
      </Button>
      <View className="items-center mt-2">
        <Pressable
          className="px-4 py-2 ls-hear-about-us-skip-step"
          data-testid="hear-about-us-skip-step"
          testID="hear-about-us-skip-step"
          onPress={() => complete("")}
        >
          <Text className="text-sm font-bold text-text-secondary">Skip this step</Text>
        </Pressable>
      </View>
    </View>
  );

  if (isScreen) {
    return (
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {body}
        </ScrollView>
        {footer}
      </View>
    );
  }

  return (
    <View>
      <View className="flex-row items-center px-3 pt-3 pb-2" style={{ gap: 4 }}>
        <BackButton onPress={() => setStep(1)} />
        <Text
          className="flex-1 pl-2 text-xs font-bold uppercase text-text-error"
          numberOfLines={1}
          style={{ letterSpacing: 1 }}
        >
          {option?.eyebrow}
        </Text>
        <SkipButton onPress={skipPress} />
      </View>
      {body}
      {footer}
    </View>
  );
}

function ChipView({ chip, onPress }: { chip: IHearAboutUsChip; onPress: () => void }): JSX.Element {
  const isCoral = chip.variant === "coral";
  const baseCn = isCoral
    ? "border-border-cardyellow bg-background-lighterror"
    : "border-border-neutral bg-background-subtle";
  const textCn = isCoral ? "text-text-error" : "text-text-primary";
  const iconColor = isCoral ? Tailwind_semantic().text.error : Tailwind_semantic().text.primary;
  return (
    <Pressable
      className={`flex-row items-center border rounded-full px-3 py-2 ls-hear-about-us-chip ${baseCn}`}
      style={{ borderRadius: 999, minHeight: 32 }}
      data-testid={`hear-about-us-chip-${chip.value}`}
      testID={`hear-about-us-chip-${chip.value}`}
      onPress={onPress}
    >
      {chip.icon === "speaker" && (
        <View className="mr-2">
          <IconSpeaker size={18} color={iconColor} />
        </View>
      )}
      <Text className={`text-sm font-semibold ${textCn}`} numberOfLines={1}>
        {chip.label}
      </Text>
    </Pressable>
  );
}

function FreeformInput(props: {
  placeholder: string;
  defaultValue: string;
  onChangeText: (t: string) => void;
  onEndEditing: () => void;
}): JSX.Element {
  return (
    <TextInput
      className="w-full px-4 py-4 text-base leading-5 border rounded-2xl border-border-neutral bg-background-subtle text-text-primary"
      style={
        Platform.OS === "android"
          ? { minHeight: 52, paddingVertical: 16, includeFontPadding: false }
          : { minHeight: 52 }
      }
      placeholder={props.placeholder}
      placeholderTextColor={Tailwind_semantic().text.secondarysubtle}
      defaultValue={props.defaultValue}
      onChangeText={props.onChangeText}
      onEndEditing={props.onEndEditing}
      autoCapitalize="none"
      autoCorrect={false}
      data-testid="hear-about-us-freeform"
      testID="hear-about-us-freeform"
    />
  );
}
