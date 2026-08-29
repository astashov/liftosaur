/* eslint-disable @typescript-eslint/naming-convention */
import type { HostComponent, ViewProps } from "react-native";
import type { Int32, Float, DirectEventHandler, WithDefault } from "react-native/Libraries/Types/CodegenTypes";
import codegenNativeComponent from "react-native/Libraries/Utilities/codegenNativeComponent";
import codegenNativeCommands from "react-native/Libraries/Utilities/codegenNativeCommands";

// Offsets are UTF-16 code units (matches NSRange on iOS and Java string indices on Android,
// and Lezer's offsets on the JS side — no conversion anywhere).
interface TextDeltaEvent {
  start: Int32;
  end: Int32;
  insertedText: string;
  // Full document length after the edit — cheap desync detection for the JS-side mirror.
  textLength: Int32;
}

interface SelectionChangeEvent {
  start: Int32;
  end: Int32;
}

interface ContentSizeChangeEvent {
  width: Float;
  height: Float;
}

interface EditorTapEvent {
  index: Int32;
}

// Vertical extent (dp) of a character range inside the editor's own content box. Emitted in
// response to requestCaretRect so a host can scroll it clear of docked chrome.
interface EditorCaretRectEvent {
  top: Float;
  bottom: Float;
}

// JSON [{top, bottom, left}], parallel to the ranges requestRangeRects was called with. One
// event for the whole set: a drag needs every block's extent at once, and a per-range event
// carries nothing to match responses back to their request.
interface EditorRangeRectsEvent {
  rects: string;
}

export interface NativeProps extends ViewProps {
  initialText?: string;
  fontSize?: Float;
  // false = structured mode: read-only, system keyboard suppressed, taps emit onEditorTap.
  editable?: WithDefault<boolean, true>;
  // Numbering is per-editor, so it only means something where the document is a whole day —
  // that's also where eval errors quote a line to go find.
  showLineNumbers?: WithDefault<boolean, false>;
  // JSON {text, selection, caret, handle, lineNumber} of hex colors. The chrome each platform's
  // editor paints itself (unstyled text, selection, caret, handles, line numbers) comes from
  // its own theme, not from the styled ranges, and neither native side can see the app's theme
  // — it's Uniwind's, not the system's — so the palette has to be handed over.
  colors?: string;
  onTextDelta?: DirectEventHandler<TextDeltaEvent>;
  onEditorSelectionChange?: DirectEventHandler<SelectionChangeEvent>;
  onEditorContentSizeChange?: DirectEventHandler<ContentSizeChangeEvent>;
  onEditorTap?: DirectEventHandler<EditorTapEvent>;
  onEditorCaretRect?: DirectEventHandler<EditorCaretRectEvent>;
  onEditorRangeRects?: DirectEventHandler<EditorRangeRectsEvent>;
}

interface NativeCommands {
  setText: (viewRef: React.ElementRef<HostComponent<NativeProps>>, text: string) => void;
  // JSON array of {start, end, color?, backgroundColor?, italic?, bold?} — JSON keeps the
  // command signature stable during the spike; flatten to typed arrays if profiling says so.
  setStyledRanges: (viewRef: React.ElementRef<HostComponent<NativeProps>>, rangesJson: string) => void;
  // Delta protocol: replaces stored ranges whose start falls in [start, end) with the given
  // ones (same JSON shape, all inside the window). Keeps per-keystroke payloads proportional
  // to the edited region instead of resending the whole document's ranges.
  patchStyledRanges: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    start: Int32,
    end: Int32,
    rangesJson: string
  ) => void;
  setSelection: (viewRef: React.ElementRef<HostComponent<NativeProps>>, start: Int32, end: Int32) => void;
  // Puts the system keyboard away without leaving freeform. The freeform suggestion strip is
  // an RN view, not an inputAccessoryView, so the hide affordance has to reach native from JS.
  blurEditor: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
  // Fires the same onTextDelta as user edits on both platforms (Runestone routes replace()
  // through shouldChangeText; sora's Content.replace fires ContentChangeEvent), so the JS
  // mirror needs no special handling for programmatic edits.
  replaceRange: (viewRef: React.ElementRef<HostComponent<NativeProps>>, start: Int32, end: Int32, text: string) => void;
  // Request/response: focus in structured mode is driven from JS (taps, pills, breadcrumbs),
  // so the native side has no selection to report a rect for on its own.
  requestCaretRect: (viewRef: React.ElementRef<HostComponent<NativeProps>>, start: Int32, end: Int32) => void;
  // JSON array of {start, end}; answered as one onEditorRangeRects with the rects in the same
  // order. Used to build the drag map for reordering, where every exercise's extent is needed
  // before the finger moves.
  requestRangeRects: (viewRef: React.ElementRef<HostComponent<NativeProps>>, rangesJson: string) => void;
}

export const Commands = codegenNativeCommands<NativeCommands>({
  supportedCommands: [
    "setText",
    "setStyledRanges",
    "patchStyledRanges",
    "setSelection",
    "blurEditor",
    "replaceRange",
    "requestCaretRect",
    "requestRangeRects",
  ],
});

export default codegenNativeComponent<NativeProps>("LiftoEditor");
