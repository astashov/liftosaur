import { RefObject, useCallback, useRef } from "react";
import { Platform, View } from "react-native";
import type { INavScrollTarget, INavViewport } from "../NavScreenScrollContext";

// Breathing room between the focused token and the bottom of the scroll area. Android needs
// more: its caret drags a drop handle that hangs below the line.
const caretRevealMargin = Platform.OS === "android" ? 32 : 16;

export function useLiftoEditorCaretReveal(args: {
  scrollRef: RefObject<INavScrollTarget | null>;
  viewportRef: RefObject<INavViewport | null>;
  scrollYRef: RefObject<number>;
}): { editorBoxRef: RefObject<View | null>; revealCaret: (rect: { top: number; bottom: number }) => void } {
  const { scrollRef, viewportRef, scrollYRef } = args;
  const editorBoxRef = useRef<View>(null);
  // Both boxes in window coordinates so their difference is exact whatever the window's origin
  // is; on Android edge-to-edge nothing here may be derived from window height or insets.
  const revealCaret = useCallback(
    (rect: { top: number; bottom: number }): void => {
      const scrollNode = scrollRef.current;
      const viewport = viewportRef.current;
      const editorBox = editorBoxRef.current;
      if (scrollNode == null || viewport == null || editorBox == null) {
        return;
      }
      viewport.measureInWindow((_vx, vy, _vw, vh) => {
        editorBox.measureInWindow((_x, y) => {
          const visibleBottom = vy + vh - caretRevealMargin;
          const caretBottom = y + rect.bottom;
          if (caretBottom <= visibleBottom) {
            return;
          }
          scrollNode.scrollTo({
            y: Math.max(0, (scrollYRef.current ?? 0) + (caretBottom - visibleBottom)),
            animated: true,
          });
        });
      });
    },
    [scrollRef, viewportRef, scrollYRef]
  );
  return { editorBoxRef, revealCaret };
}
