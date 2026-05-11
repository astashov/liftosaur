import { JSX, useEffect, useState } from "react";
import { View } from "react-native";
import QRCode from "qrcode";
import { SvgXml } from "./primitives/svg";
import { Text } from "./primitives/text";

interface IProgramQrCodeProps {
  url: string;
  size?: number;
  title?: string;
}

export function ProgramQrCode(props: IProgramQrCodeProps): JSX.Element | null {
  const size = props.size ?? 160;
  const [svg, setSvg] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(props.url, { type: "svg", margin: 1 })
      .then((result) => {
        if (!cancelled) {
          setSvg(result);
        }
      })
      .catch((error) => {
        console.error(error);
      });
    return () => {
      cancelled = true;
    };
  }, [props.url]);

  if (!svg) {
    return null;
  }

  return (
    <View className="mt-1">
      {props.title && <Text className="text-xs text-text-secondary">{props.title}</Text>}
      <SvgXml xml={svg} width={size} height={size} />
    </View>
  );
}
