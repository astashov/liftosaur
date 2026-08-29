import UIKit
import Runestone

// Native host for the Liftoscript editor: a Runestone TextView driven by externally
// computed styled ranges (Lezer parses on the RN JS thread and pushes ranges back).
// The ObjC++ Fabric layer (RCTLiftoEditorView.mm) only marshals props/commands/events;
// everything UIKit lives here. The @objc surface uses only primitives/Foundation types
// so no Runestone type leaks into Liftosaur-Swift.h.
@objc public class LiftoEditorContentView: UIView {
  @objc public var onTextDelta: ((Int, Int, String, Int) -> Void)?
  @objc public var onSelectionChange: ((Int, Int) -> Void)?
  @objc public var onContentSizeChange: ((Double, Double) -> Void)?
  @objc public var onTap: ((Int) -> Void)?
  @objc public var onCaretRect: ((Double, Double) -> Void)?
  @objc public var onRangeRects: ((String) -> Void)?

  private let textView = TextView()
  private let rangesStore = ExternalRangesStore()
  private var hasSetInitialText = false
  private var currentFontSize: Double = 16
  private var contentSizeObservation: NSKeyValueObservation?
  private var lastReportedContentHeight: CGFloat = -1
  private var structuredTapRecognizer: UITapGestureRecognizer?
  private let tapDelegateProxy = LiftoEditorTapDelegateProxy()
  private var currentColors = LiftoEditorColors()

  public override init(frame: CGRect) {
    super.init(frame: frame)
    textView.editorDelegate = self
    applyTheme()
    textView.setLanguageMode(ExternalRangesLanguageMode(store: rangesStore))
    textView.showLineNumbers = false
    // Runestone's 3pt default leaves the number touching the first character. The gutter's
    // own trailing padding is inside its background, so the gap to the code comes from the
    // text container instead — padding it there would only widen the tinted strip.
    textView.gutterLeadingPadding = 6
    textView.gutterTrailingPadding = 4
    textView.textContainerInset = UIEdgeInsets(top: 0, left: 4, bottom: 0, right: 0)
    textView.isLineWrappingEnabled = true
    textView.autocorrectionType = .no
    textView.autocapitalizationType = .none
    textView.spellCheckingType = .no
    textView.smartQuotesType = .no
    textView.smartDashesType = .no
    textView.smartInsertDeleteType = .no
    textView.backgroundColor = .clear
    // Both matter for caret-drag accuracy: bounce lets a long-press drag rubber-band the
    // content under the finger, and .automatic inset (under the native-stack nav controller)
    // skews the vertical touch->text-position mapping.
    textView.alwaysBounceVertical = false
    textView.contentInsetAdjustmentBehavior = .never
    addSubview(textView)
    // Only active in structured (non-editable) mode; in editable mode Runestone's own
    // gesture handling owns taps. Simultaneous recognition is required because Runestone's
    // UITextInteraction recognizers otherwise claim the tap and force this one to fail.
    let tapRecognizer = UITapGestureRecognizer(target: self, action: #selector(handleStructuredTap(_:)))
    tapRecognizer.isEnabled = false
    tapRecognizer.delegate = tapDelegateProxy
    textView.addGestureRecognizer(tapRecognizer)
    structuredTapRecognizer = tapRecognizer
    contentSizeObservation = textView.observe(\.contentSize, options: [.new]) { [weak self] observedTextView, _ in
      guard let self = self else {
        return
      }
      let size = observedTextView.contentSize
      if abs(size.height - self.lastReportedContentHeight) > 0.5 {
        self.lastReportedContentHeight = size.height
        self.onContentSizeChange?(Double(size.width), Double(size.height))
      }
    }
  }

  // Resigning is enough: JS treats the keyboard going away as leaving freeform, so every
  // dismissal path — the suggestion strip's chevron, the drag gesture, Android's back — lands
  // in the same place.
  @objc public func blurEditor() {
    textView.resignFirstResponder()
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    textView.frame = bounds
  }

  @objc public func setInitialText(_ text: String) {
    if !hasSetInitialText {
      hasSetInitialText = true
      textView.text = text
    }
  }

  @objc public func applyText(_ text: String) {
    textView.text = text
  }

  @objc public func prepareForReuse() {
    hasSetInitialText = false
    lastReportedContentHeight = -1
    textView.text = ""
    rangesStore.setRanges([])
  }

  @objc public func applyFontSize(_ size: Double) {
    guard size > 0, size != currentFontSize else {
      return
    }
    currentFontSize = size
    applyTheme()
  }

  @objc public func applyColorsJson(_ json: String) {
    guard let data = json.data(using: .utf8),
      let values = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
    else {
      return
    }
    currentColors = LiftoEditorColors(
      text: LiftoEditorContentView.parseColor(values["text"] as? String) ?? currentColors.text,
      selection: LiftoEditorContentView.parseColor(values["selection"] as? String) ?? currentColors.selection,
      caret: LiftoEditorContentView.parseColor(values["caret"] as? String) ?? currentColors.caret,
      handle: LiftoEditorContentView.parseColor(values["handle"] as? String) ?? currentColors.handle,
      lineNumber: LiftoEditorContentView.parseColor(values["lineNumber"] as? String) ?? currentColors.lineNumber
    )
    applyTheme()
  }

  // The selection highlight and caret are the text input's, not the theme's, and the drag
  // handles are UITextInteraction's, drawn with the view's tint.
  private func applyTheme() {
    textView.theme = LiftoEditorTheme(fontSize: CGFloat(currentFontSize), colors: currentColors)
    textView.insertionPointColor = currentColors.caret
    textView.selectionHighlightColor = currentColors.selection
    textView.tintColor = currentColors.handle
  }

  @objc public func applyShowLineNumbers(_ show: Bool) {
    textView.showLineNumbers = show
  }

  @objc public func applyEditable(_ editable: Bool) {
    textView.isEditable = editable
    // Selection gestures must die with editability: otherwise the double tap that enters
    // freeform ALSO triggers the system word-selection, which then fights the programmatic
    // caret and swallows typing until the user taps elsewhere.
    textView.isSelectable = editable
    structuredTapRecognizer?.isEnabled = !editable
    if !editable {
      textView.resignFirstResponder()
    }
  }

  @objc private func handleStructuredTap(_ recognizer: UITapGestureRecognizer) {
    // location(in:) on a scroll view is in bounds space, whose origin is contentOffset,
    // so the point is already in text-content coordinates.
    let point = recognizer.location(in: textView)
    if let index = textView.characterIndex(at: point) {
      onTap?(index)
    }
  }

  @objc public func applySelection(_ start: Int, end: Int) {
    let length = (textView.text as NSString).length
    let clampedStart = max(0, min(start, length))
    let clampedEnd = max(clampedStart, min(end, length))
    textView.selectedRange = NSRange(location: clampedStart, length: clampedEnd - clampedStart)
    // Programmatic selection while editable means JS wants a real editing session
    // (structured → freeform hand-off), so bring up the system keyboard too.
    if textView.isEditable && !textView.isFirstResponder {
      textView.becomeFirstResponder()
    }
  }

  // Structured mode never sets a selection (that would sprout native selection UI), so the
  // focused range comes from JS and its rect has to be resolved on demand. caretRect is in
  // the text view's content space; the text view fills our bounds, so subtracting the content
  // offset lands it in this view's coordinates.
  @objc public func requestCaretRect(_ start: Int, end: Int) {
    guard let rect = verticalExtent(start: start, end: end) else {
      return
    }
    onCaretRect?(rect.top, rect.bottom)
  }

  // Answered in one event: the caller (a drag) needs every extent before it can act on any of
  // them, and a per-range event would carry nothing to match it back to its request.
  @objc public func requestRangeRects(_ json: String) {
    guard let data = json.data(using: .utf8),
      let items = (try? JSONSerialization.jsonObject(with: data)) as? [[String: Any]]
    else {
      return
    }
    let rects: [[String: Double]] = items.map { item in
      let extent = verticalExtent(start: item["start"] as? Int ?? 0, end: item["end"] as? Int ?? 0)
      return ["top": extent?.top ?? 0, "bottom": extent?.bottom ?? 0, "left": extent?.left ?? 0]
    }
    guard let payload = try? JSONSerialization.data(withJSONObject: rects),
      let string = String(data: payload, encoding: .utf8)
    else {
      return
    }
    onRangeRects?(string)
  }

  // `left` is where the text column begins — the caret's x at the range's first character,
  // which for a range starting at a line start is the gutter's trailing edge.
  private func verticalExtent(start: Int, end: Int) -> (top: Double, bottom: Double, left: Double)? {
    let length = textView.text.utf16.count
    let clampedStart = min(max(start, 0), length)
    let clampedEnd = min(max(end, clampedStart), length)
    guard let startPosition = textView.position(from: textView.beginningOfDocument, offset: clampedStart) else {
      return nil
    }
    let startRect = textView.caretRect(for: startPosition)
    var bottom = startRect.maxY
    if let endPosition = textView.position(from: textView.beginningOfDocument, offset: clampedEnd) {
      bottom = max(bottom, textView.caretRect(for: endPosition).maxY)
    }
    let offsetY = textView.contentOffset.y
    return (Double(startRect.minY - offsetY), Double(bottom - offsetY), Double(startRect.minX))
  }

  @objc public func applyReplaceRange(_ start: Int, end: Int, text: String) {
    let length = (textView.text as NSString).length
    guard start >= 0, end >= start, end <= length else {
      return
    }
    textView.replace(NSRange(location: start, length: end - start), withText: text)
  }

  // Fabric attaches the event emitter after updateProps, so the content-size emission
  // triggered by the initial setText is dropped; the ObjC++ layer calls this to re-send
  // once the emitter is in place.
  @objc public func flushContentSize() {
    let size = textView.contentSize
    lastReportedContentHeight = size.height
    onContentSizeChange?(Double(size.width), Double(size.height))
  }

  @objc public func applyStyledRangesJson(_ json: String) {
    guard let ranges = LiftoEditorContentView.parseRanges(json) else {
      return
    }
    rangesStore.setRanges(ranges)
    textView.redisplayVisibleLines()
  }

  @objc public func applyStyledRangesPatch(_ start: Int, end: Int, json: String) {
    guard let ranges = LiftoEditorContentView.parseRanges(json) else {
      return
    }
    rangesStore.applyPatch(windowStart: start, windowEnd: end, ranges: ranges)
    textView.redisplayVisibleLines()
  }

  private static func parseRanges(_ json: String) -> [ExternalStyledRange]? {
    guard let data = json.data(using: .utf8),
      let items = (try? JSONSerialization.jsonObject(with: data)) as? [[String: Any]]
    else {
      return nil
    }
    return items.compactMap { item -> ExternalStyledRange? in
      guard let start = item["start"] as? Int, let end = item["end"] as? Int, end > start else {
        return nil
      }
      return ExternalStyledRange(
        range: NSRange(location: start, length: end - start),
        color: LiftoEditorContentView.parseColor(item["color"] as? String),
        backgroundColor: LiftoEditorContentView.parseColor(item["backgroundColor"] as? String),
        isBold: item["bold"] as? Bool ?? false,
        isItalic: item["italic"] as? Bool ?? false
      )
    }
  }

  private static func parseColor(_ value: String?) -> UIColor? {
    guard var hex = value?.trimmingCharacters(in: .whitespaces), hex.hasPrefix("#") else {
      return nil
    }
    hex.removeFirst()
    if hex.count == 3 {
      hex = hex.map { "\($0)\($0)" }.joined()
    }
    guard hex.count == 6 || hex.count == 8, let raw = UInt64(hex, radix: 16) else {
      return nil
    }
    let hasAlpha = hex.count == 8
    let rgb = hasAlpha ? raw >> 8 : raw
    let alpha = hasAlpha ? CGFloat(raw & 0xff) / 255.0 : 1.0
    return UIColor(
      red: CGFloat((rgb >> 16) & 0xff) / 255.0,
      green: CGFloat((rgb >> 8) & 0xff) / 255.0,
      blue: CGFloat(rgb & 0xff) / 255.0,
      alpha: alpha
    )
  }
}

// The chrome the editor paints on its own. The app's theme is picked in JS (a setting, not
// the system appearance), so the system's dynamic colors would be wrong whenever the two
// disagree — these arrive from JS instead, and the defaults only cover the first frame.
struct LiftoEditorColors {
  var text: UIColor = .label
  var selection: UIColor = .label.withAlphaComponent(0.2)
  var caret: UIColor = .label
  var handle: UIColor = .tintColor
  var lineNumber: UIColor = .secondaryLabel
}

// The app's code font (same face FastText/styledText use); syntax colors come from the
// external styled ranges, so the theme only carries the base font and the neutral colors.
private final class LiftoEditorTheme: Runestone.Theme {
  let font: UIFont
  let textColor: UIColor
  // A tint rather than a solid: it has to read as a gutter against both the light and the
  // dark editor background, and the system fills are the only ones that follow both.
  let gutterBackgroundColor: UIColor = .quaternarySystemFill
  let gutterHairlineColor: UIColor = .clear
  let lineNumberColor: UIColor
  let lineNumberFont: UIFont
  let selectedLineBackgroundColor: UIColor = .clear
  let selectedLinesLineNumberColor: UIColor
  let selectedLinesGutterBackgroundColor: UIColor = .quaternarySystemFill
  let invisibleCharactersColor: UIColor = .tertiaryLabel
  let pageGuideHairlineColor: UIColor = .clear
  let pageGuideBackgroundColor: UIColor = .clear
  let markedTextBackgroundColor: UIColor = .systemFill

  init(fontSize: CGFloat, colors: LiftoEditorColors) {
    let font = UIFont(name: "Iosevka", size: fontSize) ?? .monospacedSystemFont(ofSize: fontSize, weight: .regular)
    self.font = font
    self.lineNumberFont = font
    self.textColor = colors.text
    self.lineNumberColor = colors.lineNumber
    self.selectedLinesLineNumberColor = colors.lineNumber
  }

  func textColor(for highlightName: String) -> UIColor? {
    nil
  }
}

// Conforming LiftoEditorContentView (an @objc public class) to the ObjC protocol directly
// would leak the conformance into Liftosaur-Swift.h; keep it on a fileprivate proxy.
private final class LiftoEditorTapDelegateProxy: NSObject, UIGestureRecognizerDelegate {
  func gestureRecognizer(
    _ gestureRecognizer: UIGestureRecognizer,
    shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
  ) -> Bool {
    true
  }
}

extension LiftoEditorContentView: TextViewDelegate {
  public func textView(_ textView: TextView, shouldChangeTextIn range: NSRange, replacementText text: String) -> Bool {
    // Shift the external ranges for this edit before Runestone rehighlights the line —
    // fresh ranges only arrive after an async JS round trip, and repainting with the
    // unshifted ones flashes wrong colors for a frame.
    rangesStore.applyEdit(in: range, replacementLength: (text as NSString).length)
    let lengthAfter = (textView.text as NSString).length - range.length + (text as NSString).length
    onTextDelta?(range.location, range.location + range.length, text, lengthAfter)
    return true
  }

  public func textViewDidChangeSelection(_ textView: TextView) {
    let range = textView.selectedRange
    onSelectionChange?(range.location, range.location + range.length)
  }
}
