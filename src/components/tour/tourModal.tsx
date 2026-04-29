import { JSX, useEffect, useRef, useState } from "react";
import { Tour_stepHelpFlag } from "./tourTypes";
import { Button } from "../button";
import { IState, IStateTour } from "../../models/state";
import { IconCloseCircleOutline } from "../icons/iconCloseCircleOutline";
import { tourConfigs } from "./tourConfigs";
import { ImagePreloader_preload } from "../../utils/imagePreloader";

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
      console.log("Sending flag", flag);
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

  if (isPaused) {
    return null;
  }

  if (!currentStep) {
    handleClose();
    return null;
  }

  const dinoImage = `/images/${currentStep.dino}`;

  return (
    <div className="overflow-hidden rounded-lg">
      <div className="relative pb-6 bg-background-cardyellow">
        {activeSteps.length > 1 ? (
          <div className="flex gap-1.5 pl-4 pt-5 pb-3 pr-12">
            {activeSteps.map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full ${i <= currentIndex ? "bg-background-yellowdark" : "bg-color-yellow300"}`}
              />
            ))}
          </div>
        ) : (
          <div className="h-10" />
        )}

        <button
          className="absolute z-10 p-1 nm-tour-close"
          data-testid="tour-close"
          style={{ top: "8px", right: "8px" }}
          onClick={handleClose}
        >
          <IconCloseCircleOutline size={24} />
        </button>

        <div className="flex items-center justify-center px-8" style={{ height: "120px" }}>
          {dinoImage && <img src={dinoImage} alt="" className="h-full" />}
        </div>

        <svg
          className="absolute bottom-0 left-0 w-full"
          viewBox="0 0 340 24"
          fill="none"
          preserveAspectRatio="none"
          style={{ height: "24px" }}
        >
          <path d="M0 24 C85 0, 255 0, 340 24 L340 24 L0 24 Z" className="fill-background-default" />
        </svg>
      </div>

      <div className="px-6 pb-6 bg-background-default">
        <h2 className="mb-3 text-xl font-bold text-center text-text-primary">{currentStep.title}</h2>

        <div className="mb-5 text-sm leading-relaxed text-text-secondary">{currentStep.content(state)}</div>

        <div className="flex gap-3">
          {activeSteps.length > 1 && (
            <Button
              name="tour-prev"
              kind="lightgrayv3"
              buttonSize="lg2"
              className="flex-1"
              onClick={handlePrev}
              disabled={isFirstStep}
            >
              {"\u2190 Back"}
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
            {isLastStep ? "Done" : "Next \u2192"}
          </Button>
        </div>
      </div>
    </div>
  );
}
