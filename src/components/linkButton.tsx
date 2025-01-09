import { TouchableOpacity, TouchableOpacityProps } from "react-native";
import { LftText } from "./lftText";

type IProps = TouchableOpacityProps & { name: string };

export function LinkButton(props: IProps): JSX.Element {
  const { className, children, ...otherProps } = props;
  return (
    <TouchableOpacity {...otherProps}>
      <LftText
        className={`text-bluev2 border-none ${
          !className || className.indexOf("font-normal") === -1 ? "font-bold" : ""
        } underline ${className} nm-${props.name}`}
      >
        {children}
      </LftText>
    </TouchableOpacity>
  );
}
