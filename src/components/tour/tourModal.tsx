import { JSX, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { SvgUri } from "react-native-svg";
import { Svg, Path, SvgXml } from "../primitives/svg";
import { Tour_stepHelpFlag } from "./tourTypes";
import { Button } from "../button";
import { IState, IStateTour } from "../../models/state";
import { IconCloseCircleOutline } from "../icons/iconCloseCircleOutline";
import { tourConfigs } from "./tourConfigs";
import { ImagePreloader_preload, ImagePreloader_uri } from "../../utils/imagePreloader";
import { HostConfig_resolveUrl } from "../../utils/hostConfig";
import { BundledImages_svgXml } from "../../utils/bundledImages";

interface ITourModalProps {
  stateTour: IStateTour;
  state: IState;
  onClose: () => void;
  onStepSeen: (stepId: string) => void;
}

function isStepActive(
  stateTour: IStateTour,
  step: (typeof tourConfigs)[keyof typeof tourConfigs]["steps"][number],
  helps: string[],
  state: IState
): boolean {
  const conditionMet = !step.condition || step.condition(state);
  const alreadySeen = helps.includes(Tour_stepHelpFlag(stateTour.id, step.id));
  return conditionMet && (stateTour.enforced || !alreadySeen);
}

function DinoImage({ filename, height }: { filename: string; height: number }): JSX.Element {
  const path = `/images/${filename}`;
  if (filename.endsWith(".svg")) {
    const bundledXml = BundledImages_svgXml(path);
    if (bundledXml) {
      return <SvgXml xml={bundledXml} width={200} height={height} />;
    }
    return <SvgUri uri={HostConfig_resolveUrl(path)} width={200} height={height} />;
  }
  return <Image source={{ uri: ImagePreloader_uri(path) }} style={{ height, width: 200, resizeMode: "contain" }} />;
}

export function TourModalContent(props: ITourModalProps): JSX.Element | null {
  const { state, onClose, onStepSeen } = props;
  const { id, enforced } = props.stateTour;
  const config = tourConfigs[id];
  const [helps] = useState(state.storage.helps);
  const activeSteps = enforced
    ? config.steps
    : config.steps.filter((step) => isStepActive(props.stateTour, step, helps, state));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());

  const currentStep = activeSteps[currentIndex];
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === activeSteps.length - 1;
  const canProceed = !currentStep?.waitFor || currentStep.waitFor(state);

  useEffect(() => {
    for (const step of config.steps) {
      ImagePreloader_preload(`/images/${step.dino}`);
    }
  }, []);

  useEffect(() => {
    if (currentStep && !seenRef.current.has(currentStep.id)) {
      seenRef.current.add(currentStep.id);
      const flag = Tour_stepHelpFlag(config.id, currentStep.id);
      onStepSeen(flag);
    }
  }, [currentStep?.id]);

  const handleClose = (): void => {
    for (const step of activeSteps) {
      if (!seenRef.current.has(step.id)) {
        seenRef.current.add(step.id);
        onStepSeen(Tour_stepHelpFlag(config.id, step.id));
      }
    }
    onClose();
  };

  const handleNext = (): void => {
    if (config.waitForNextTrigger?.(currentStep.id, state)) {
      setIsPaused(true);
      return;
    }

    if (isLastStep) {
      onClose();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handlePrev = (): void => {
    if (!isFirstStep) {
      setCurrentIndex((i) => i - 1);
    }
  };

  useEffect(() => {
    if (!isPaused && !currentStep) {
      handleClose();
    }
  }, [currentStep, isPaused]);

  if (isPaused || !currentStep) {
    return null;
  }

  return (
    <View>
      <View className="relative pb-6 bg-background-cardyellow">
        {activeSteps.length > 1 ? (
          <View className="flex-row gap-1.5 pl-4 pt-5 pb-3 pr-12">
            {activeSteps.map((_, i) => (
              <View
                key={i}
                className={`h-2 flex-1 rounded-full ${i <= currentIndex ? "bg-background-yellowdark" : "bg-color-yellow300"}`}
              />
            ))}
          </View>
        ) : (
          <View className="h-10" />
        )}

        <Pressable
          className="absolute z-10 p-1 nm-tour-close"
          testID="tour-close"
          style={{ top: 8, right: 8 }}
          onPress={handleClose}
        >
          <IconCloseCircleOutline size={24} />
        </Pressable>

        <View className="flex-row items-center justify-center px-8" style={{ height: 120 }}>
          <DinoImage filename={currentStep.dino} height={120} />
        </View>

        <Svg
          style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 24 }}
          viewBox="0 0 340 24"
          fill="none"
          preserveAspectRatio="none"
        >
          <Path d="M0 24 C85 0, 255 0, 340 24 L340 24 L0 24 Z" className="fill-background-default" />
        </Svg>
      </View>

      <View className="px-6 pb-6 bg-background-default">
        <Text className="mb-3 text-xl font-bold text-center text-text-primary">{currentStep.title}</Text>

        <View className="mb-5">{currentStep.content(state)}</View>

        <View className="flex-row gap-3">
          {activeSteps.length > 1 && (
            <Button
              name="tour-prev"
              kind="lightgrayv3"
              buttonSize="lg2"
              className="flex-1"
              onClick={handlePrev}
              disabled={isFirstStep}
            >
              {"← Back"}
            </Button>
          )}
          <Button
            name="tour-next"
            kind="orange"
            buttonSize="lg2"
            className="flex-1"
            onClick={handleNext}
            disabled={!canProceed}
          >
            {isLastStep ? "Done" : "Next →"}
          </Button>
        </View>
      </View>
    </View>
  );
}
