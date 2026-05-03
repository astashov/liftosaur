import { JSX, useEffect, useMemo } from "react";
import { View, useWindowDimensions, StyleSheet } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";

const CONFETTI_COLORS = [
  "#1E90FF",
  "#6B8E23",
  "#FFD700",
  "#FFC0CB",
  "#6A5ACD",
  "#ADD8E6",
  "#EE82EE",
  "#98FB98",
  "#4682B4",
  "#F4A460",
  "#D2691E",
  "#DC143C",
];

const PARTICLE_COUNT = 120;

interface IParticleProps {
  startX: number;
  startY: number;
  endY: number;
  color: string;
  size: number;
  duration: number;
  swayAmplitude: number;
  swayFrequency: number;
  initialRotation: number;
  rotationSpeed: number;
}

function Particle(props: IParticleProps): JSX.Element {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: props.duration, easing: Easing.linear });
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const y = props.startY + (props.endY - props.startY) * t;
    const x = props.startX + Math.sin(t * props.swayFrequency * Math.PI * 2) * props.swayAmplitude;
    const rotate = props.initialRotation + props.rotationSpeed * t;
    const opacity = t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1;
    return {
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${rotate}deg` }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: props.size * 2,
          height: props.size,
          backgroundColor: props.color,
          borderRadius: 1,
        },
        animatedStyle,
      ]}
    />
  );
}

export function Confetti(): JSX.Element {
  const { width, height } = useWindowDimensions();

  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
      key: i,
      startX: Math.random() * width,
      startY: Math.random() * height - height,
      endY: height + 40,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 4 + Math.random() * 6,
      duration: 2200 + Math.random() * 1600,
      swayAmplitude: 20 + Math.random() * 60,
      swayFrequency: 0.5 + Math.random() * 2,
      initialRotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 1440,
    }));
  }, [width, height]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { zIndex: 20 }]}>
      {particles.map((p) => (
        <Particle
          key={p.key}
          startX={p.startX}
          startY={p.startY}
          endY={p.endY}
          color={p.color}
          size={p.size}
          duration={p.duration}
          swayAmplitude={p.swayAmplitude}
          swayFrequency={p.swayFrequency}
          initialRotation={p.initialRotation}
          rotationSpeed={p.rotationSpeed}
        />
      ))}
    </View>
  );
}
