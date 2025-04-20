import { h, JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

interface StorySliderProps {
  slides: JSX.Element[];
  duration?: number;
}

export default function StorySlider({ slides, duration = 5000 }: StorySliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progresses, setProgresses] = useState<number[]>(Array(slides.length).fill(0));
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const startProgress = (timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = timestamp - startTimeRef.current;

    const progressRatio = Math.min(elapsed / duration, 1);
    setProgresses((prev) => prev.map((p, i) => (i === currentIndex ? progressRatio : i < currentIndex ? 1 : 0)));

    if (progressRatio < 1) {
      animationRef.current = requestAnimationFrame(startProgress);
    } else {
      goToNext();
    }
  };

  const goToIndex = (index: number) => {
    if (index < 0 || index >= slides.length) return;
    setCurrentIndex(index);
    setProgresses((prev) => prev.map((_, i) => (i < index ? 1 : i === index ? 0 : 0)));
    startTimeRef.current = null;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(startProgress);
  };

  const goToNext = () => {
    const nextIndex = (currentIndex + 1) % slides.length;
    goToIndex(nextIndex);
  };

  const goToPrevious = () => {
    const nextIndex = currentIndex === 0 ? slides.length - 1 : currentIndex - 1;
    goToIndex(nextIndex);
  };

  useEffect(() => {
    animationRef.current = requestAnimationFrame(startProgress);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentIndex]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 px-4 pt-4">
        {slides.map((_, i) => (
          <div key={i} className="flex-1 h-1 overflow-hidden rounded bg-white/30">
            <div className="h-full bg-white" style={{ width: `${progresses[i] * 100}%` }} />
          </div>
        ))}
      </div>

      <div className="w-full h-full">{slides[currentIndex]}</div>

      <div className="absolute top-0 left-0 z-20 w-1/2 h-full" onClick={goToPrevious} />
      <div className="absolute top-0 right-0 z-20 w-1/2 h-full" onClick={goToNext} />
    </div>
  );
}
