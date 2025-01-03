import { useRef, useEffect } from "react";
import { Animated, Easing } from "react-native";
import Svg, { Path } from "react-native-svg";

interface IProps {
  width: number;
  height: number;
  color?: string;
}

export function IconSpinner(props: IProps): JSX.Element {
  const color = props.color || "#B2B2B2";

  const spinValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );

    spinAnimation.start();

    return () => spinAnimation.stop();
  }, [spinValue]);
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={{
        transform: [{ rotate: spin }], // Apply the spin transformation
        width: props.width,
        height: props.height,
      }}
    >
      <Svg viewBox="0 0 512 512" className="inline" style={{ width: props.width, height: props.height }}>
        <Path
          fill={color}
          d="M256,150.6c-9,0-15.1-6-15.1-15.1V15.1C240.9,6,247,0,256,0c9,0,15.1,6,15.1,15.1v120.5C271.1,144.6,265,150.6,256,150.6z"
        />
        <Path
          fill={color}
          d="M256,361.4c-9,0-15.1,6-15.1,15.1v120.5c0,9,6,15.1,15.1,15.1c9,0,15.1-6,15.1-15.1V376.5
        C271.1,367.4,265,361.4,256,361.4"
        />
        <Path
          fill={color}
          d="M376.6,34c-4.8,0-9.1,2.7-12.2,6.7l-60.2,103.9c-4.5,7.5-1.5,15.1,4.5,19.6c3,1.5,4.5,1.5,7.5,1.5
        c4.5,0,9-3,12-6l60.2-103.9c4.5-7.5,1.5-15.1-4.5-19.6C381.5,34.6,379,34,376.6,34"
        />
        <Path
          fill={color}
          d="M195.9,347.2c-4.8,0-9.1,2.7-12.2,6.7l-60.2,103.9c-4.5,7.5-1.5,15.1,4.5,19.6c3,1.5,4.5,1.5,7.5,1.5
        c4.5,0,9-3,12-6l60.2-103.9c4.5-7.5,1.5-15.1-4.5-19.6C200.8,347.9,198.3,347.2,195.9,347.2"
        />
        <Path
          fill={color}
          d="M134.7,32.5c-2.4,0-4.7,0.7-6.7,2.2c-6,4.5-9,13.6-4.5,19.6l60.2,103.9c3,4.5,7.5,7.5,12,7.5c3,0,4.5,0,7.5-3
        c6-4.5,9-13.6,4.5-19.6L147.6,39.2C144.6,35.1,139.5,32.5,134.7,32.5"
        />
        <Path
          fill={color}
          d="M315.5,345.7c-2.4,0-4.7,0.7-6.7,2.2c-6,4.5-9,13.6-4.5,19.6l60.2,103.9c3,4.5,7.5,7.5,12,7.5
        c3,0,4.5-1.5,7.5-3c6-4.5,9-13.6,4.5-19.6l-60.2-103.9C325.3,348.4,320.3,345.7,315.5,345.7"
        />
        <Path
          fill={color}
          d="M135.5,240.9H15.1C6,240.9,0,247,0,256c0,9,6,15.1,15.1,15.1h120.5c9,0,15.1-6,15.1-15.1
        C150.6,247,144.6,240.9,135.5,240.9"
        />
        <Path
          fill={color}
          d="M496.9,240.9H376.5c-9,0-15.1,6-15.1,15.1c0,9,6,15.1,15.1,15.1h120.5c9,0,15.1-6,15.1-15.1
        C512,247,506,240.9,496.9,240.9"
        />
        <Path
          fill={color}
          d="M48.3,121.3c-4.8,0-9.1,2.7-12.2,6.7c-4.5,7.5-1.5,15.1,4.5,19.6l103.9,60.2c3,1.5,4.5,1.5,7.5,1.5
        c4.5,0,9-1.5,12-6c4.5-7.5,1.5-15.1-4.5-19.6L55.7,123.5C53.2,122,50.7,121.3,48.3,121.3"
        />
        <Path
          fill={color}
          d="M361.5,302c-4.8,0-9.1,2.7-12.2,6.7c-4.5,7.5-1.5,15.1,4.5,19.6l103.9,60.2c3,1.5,4.5,1.5,7.5,1.5
        c4.5,0,9-1.5,12.1-6c4.5-7.5,1.5-15.1-4.5-19.6l-103.9-60.2C366.4,302.7,363.9,302,361.5,302"
        />
        <Path
          fill={color}
          d="M149.8,300.5c-2.4,0-4.7,0.7-6.7,2.2L39.2,362.9c-6,4.5-9,13.6-4.5,19.6c3,4.5,7.5,7.5,12.1,7.5c3,0,6,0,7.5-3
        l103.9-60.2c6-4.5,9-13.6,4.5-19.6C159.6,303.2,154.6,300.5,149.8,300.5"
        />
        <Path
          fill={color}
          d="M463,119.8c-2.4,0-4.7,0.7-6.8,2.2l-103.9,60.2c-6,4.5-9,13.6-4.5,19.6c3,4.5,7.5,7.5,12,7.5c3,0,4.5,0,7.5-3
        l103.9-60.2c6-4.5,9-13.6,4.5-19.6C472.8,122.5,467.8,119.8,463,119.8"
        />
      </Svg>
    </Animated.View>
  );
}
