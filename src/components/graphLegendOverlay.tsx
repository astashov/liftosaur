import { JSX, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { View, Pressable } from "react-native";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { Colors_hexToRgba } from "../utils/colors";
import { IconCloseCircle } from "./icons/iconCloseCircle";
import { useActiveGraph } from "./activeGraphContext";
import { ILineChartHandle } from "./lineChart";

interface IGraphLegendOverlayProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function GraphLegendOverlay(props: IGraphLegendOverlayProps): JSX.Element | null {
  if (!props.visible) {
    return null;
  }
  return (
    <View
      className="absolute border rounded-lg left-2 right-2 border-border-cardpurple"
      style={{
        top: -60,
        zIndex: 10,
        padding: 8,
        backgroundColor: Colors_hexToRgba(Tailwind_semantic().background.subtlecardpurple, 0.9),
      }}
    >
      <Pressable onPress={props.onClose} style={{ position: "absolute", top: 4, right: 4, zIndex: 20 }}>
        <IconCloseCircle size={18} />
      </Pressable>
      {props.children}
    </View>
  );
}

interface IGraphActiveCursor {
  cursorIdx: number | null;
  chartRef: React.RefObject<ILineChartHandle | null>;
  handleCursorChange: (idx: number | null) => void;
  onCloseOverlay: () => void;
  overlayVisible: boolean;
}

export function useGraphActiveCursor(id: string | undefined): IGraphActiveCursor {
  const { activeId, setActive } = useActiveGraph();
  const otherIsActive = id != null && activeId != null && activeId !== id;
  const chartRef = useRef<ILineChartHandle | null>(null);
  const [cursorIdx, setCursorIdx] = useState<number | null>(null);

  const handleCursorChange = useCallback(
    (idx: number | null) => {
      setCursorIdx(idx);
      if (idx != null && id != null && activeId !== id) {
        setActive(id);
      }
    },
    [activeId, id, setActive]
  );

  useEffect(() => {
    if (otherIsActive) {
      setCursorIdx(null);
      chartRef.current?.clearCursor();
    }
  }, [otherIsActive]);

  const onCloseOverlay = useCallback(() => {
    chartRef.current?.clearCursor();
    setCursorIdx(null);
    if (id != null) {
      setActive(null);
    }
  }, [id, setActive]);

  return {
    cursorIdx,
    chartRef,
    handleCursorChange,
    onCloseOverlay,
    overlayVisible: cursorIdx != null && !otherIsActive,
  };
}
