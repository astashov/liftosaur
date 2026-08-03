/* eslint-disable @typescript-eslint/naming-convention */
import type { HostComponent, ViewProps } from "react-native";
import type { Int32, Float, DirectEventHandler } from "react-native/Libraries/Types/CodegenTypes";
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

export interface NativeProps extends ViewProps {
  initialText?: string;
  fontSize?: Float;
  onTextDelta?: DirectEventHandler<TextDeltaEvent>;
  onEditorSelectionChange?: DirectEventHandler<SelectionChangeEvent>;
  onEditorContentSizeChange?: DirectEventHandler<ContentSizeChangeEvent>;
}

interface NativeCommands {
  setText: (viewRef: React.ElementRef<HostComponent<NativeProps>>, text: string) => void;
  // JSON array of {start, end, color?, backgroundColor?, italic?, bold?} — JSON keeps the
  // command signature stable during the spike; flatten to typed arrays if profiling says so.
  setStyledRanges: (viewRef: React.ElementRef<HostComponent<NativeProps>>, rangesJson: string) => void;
  setSelection: (viewRef: React.ElementRef<HostComponent<NativeProps>>, start: Int32, end: Int32) => void;
  // Fires the same onTextDelta as user edits on both platforms (Runestone routes replace()
  // through shouldChangeText; sora's Content.replace fires ContentChangeEvent), so the JS
  // mirror needs no special handling for programmatic edits.
  replaceRange: (viewRef: React.ElementRef<HostComponent<NativeProps>>, start: Int32, end: Int32, text: string) => void;
}

export const Commands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ["setText", "setStyledRanges", "setSelection", "replaceRange"],
});

export default codegenNativeComponent<NativeProps>("LiftoEditor");
