import { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { Avatar_colorIndex, Avatar_initials } from "../../models/avatar";
import { Tailwind_colors } from "../../utils/tailwindConfig";

interface IProps {
  seed: string;
  nickname?: string;
  size: number;
  dimmed?: boolean;
}

function palette(): string[] {
  const c = Tailwind_colors();
  return [
    c.purple[500],
    c.blue[600],
    c.green[700],
    c.red[500],
    c.orange[600],
    c.blue[800],
    c.purple[700],
    c.greengray[800],
  ];
}

export function Avatar(props: IProps): JSX.Element {
  const color = palette()[Avatar_colorIndex(props.seed)];
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: props.size, height: props.size, backgroundColor: color, opacity: props.dimmed ? 0.4 : 1 }}
    >
      <Text className="font-semibold text-text-alwayswhite" style={{ fontSize: Math.round(props.size * 0.38) }}>
        {Avatar_initials(props.nickname, props.seed)}
      </Text>
    </View>
  );
}
