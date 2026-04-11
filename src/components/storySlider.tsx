import { JSX, useEffect, useRef, useState } from "react";
import { View, Pressable, Animated, Easing } from "react-native";

interface IStorySliderProps {
  slides: JSX.Element[];
  duration?: number;
}

export default function StorySlider({ slides, duration = 5000 }: IStorySliderProps): JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const goToNext = (): void => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const goToPrevious = (): void => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  useEffect(() => {
    progressAnim.setValue(0);
    const animation = Animated.timing(progressAnim, {
      toValue: 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animationRef.current = animation;
    animation.start(({ finished }) => {
      if (finished) {
        goToNext();
      }
    });
    return () => {
      animation.stop();
    };
  }, [currentIndex, duration]);

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View className="relative w-full h-full overflow-hidden">
      <View className="absolute top-0 left-0 right-0 z-10 flex-row gap-1 px-4 pt-4">
        {slides.map((_, i) => {
          const fillWidth = i < currentIndex ? "100%" : i > currentIndex ? "0%" : undefined;
          return (
            <View key={i} className="flex-1 h-1 overflow-hidden rounded bg-white/30">
              {i === currentIndex ? (
                <Animated.View className="h-full bg-white" style={{ width: animatedWidth }} />
              ) : (
                <View className="h-full bg-white" style={{ width: fillWidth }} />
              )}
            </View>
          );
        })}
      </View>

      <View className="w-full h-full">{slides[currentIndex]}</View>

      <Pressable className="absolute top-0 left-0 z-20 w-1/2 h-full" onPress={goToPrevious} />
      <Pressable className="absolute top-0 right-0 z-20 w-1/2 h-full" onPress={goToNext} />
    </View>
  );
}
