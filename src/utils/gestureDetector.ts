import { useRef, useCallback } from "preact/hooks";

type IGestureDetectorCallback = (gesture: "swipeleft" | "swiperight") => void;

export class GestureDetector {
  private points: { x: number; y: number }[] = [];
  private threshold: number;
  private callback: IGestureDetectorCallback;
  private debounceTime: number;
  private lastTriggerTime: number;

  constructor(callback: IGestureDetectorCallback, threshold: number = 50, debounceTime: number = 500) {
    this.callback = callback;
    this.threshold = threshold;
    this.debounceTime = debounceTime;
    this.lastTriggerTime = 0;
  }

  public addPoint(x: number, y: number) {
    this.points.push({ x, y });

    if (this.points.length > 2) {
      this.detectSwipe();
    }
  }

  private detectSwipe() {
    const first = this.points[0];
    const last = this.points[this.points.length - 1];

    const deltaX = last.x - first.x;
    const deltaY = Math.abs(last.y - first.y);

    if (Math.abs(deltaX) >= this.threshold && deltaY < this.threshold / 2) {
      const now = Date.now();
      if (now - this.lastTriggerTime > this.debounceTime) {
        this.lastTriggerTime = now;
        this.callback(deltaX > 0 ? "swiperight" : "swipeleft");
      }
      this.reset();
    }
  }

  private reset() {
    this.points = [];
  }
}

export function useGesture(callback: IGestureDetectorCallback) {
  const swipeDetectorRef = useRef(new GestureDetector(callback));
  const isTracking = useRef(false);

  const handlePointerDown = useCallback((event: PointerEvent) => {
    isTracking.current = true;
    swipeDetectorRef.current.addPoint(event.clientX, event.clientY);
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (isTracking.current) {
      swipeDetectorRef.current.addPoint(event.clientX, event.clientY);
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    isTracking.current = false;
  }, []);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
  };
}
