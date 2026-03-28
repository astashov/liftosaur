import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, Animated } from "react-native";

interface IProps {
  slides: React.ReactElement[];
  duration?: number;
}

export function StorySlider({ slides, duration = 5000 }: IProps): React.ReactElement {
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const startAnimation = (from: number): void => {
    progressAnim.setValue(from);
    const remaining = (1 - from) * duration;
    animRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: remaining,
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => {
      if (finished) {
        goToIndex((currentIndex + 1) % slides.length);
      }
    });
  };

  const goToIndex = (index: number): void => {
    if (index < 0 || index >= slides.length) {
      return;
    }
    animRef.current?.stop();
    setCurrentIndex(index);
  };

  useEffect(() => {
    startAnimation(0);
    return () => {
      animRef.current?.stop();
    };
  }, [currentIndex]);

  return (
    <View className="relative w-full h-full overflow-hidden">
      <View className="absolute top-0 left-0 right-0 z-10 flex-row gap-1 px-4 pt-4">
        {slides.map((_, i) => (
          <View key={i} className="flex-1 h-1 overflow-hidden rounded-sm bg-white/30">
            {i < currentIndex ? (
              <View className="h-full w-full bg-white" />
            ) : i === currentIndex ? (
              <Animated.View
                className="h-full bg-white"
                style={{
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                }}
              />
            ) : null}
          </View>
        ))}
      </View>

      <View className="w-full h-full">{slides[currentIndex]}</View>

      <Pressable
        className="absolute top-0 left-0 z-20 w-1/2 h-full"
        onPress={() => goToIndex(currentIndex === 0 ? slides.length - 1 : currentIndex - 1)}
      />
      <Pressable
        className="absolute top-0 right-0 z-20 w-1/2 h-full"
        onPress={() => goToIndex((currentIndex + 1) % slides.length)}
      />
    </View>
  );
}
