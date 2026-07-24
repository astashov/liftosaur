export interface IPerfScrollMarkers {
  onScrollBeginDrag: () => void;
  onMomentumScrollEnd: () => void;
  onScrollEndDrag: () => void;
}

export function usePerfScrollMarkers(_label?: string): IPerfScrollMarkers {
  return {
    onScrollBeginDrag: () => {},
    onMomentumScrollEnd: () => {},
    onScrollEndDrag: () => {},
  };
}
