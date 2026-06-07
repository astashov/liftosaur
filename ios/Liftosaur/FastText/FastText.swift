import UIKit

// Plain marshaling model populated by the ObjC++ Fabric layer (which resolves C++ props,
// SharedColors and std::strings) and consumed by the Swift rendering/measurement below.
// Keeping this split lets all the UIKit styling/drawing/measuring logic live in Swift.
@objc public class FastTextFragmentSpec: NSObject {
  @objc public let start: Int
  @objc public let end: Int
  @objc public let color: UIColor?
  @objc public let backgroundColor: UIColor?
  @objc public let weight: Int // 0 => inherit base
  @objc public let fontSize: CGFloat // 0 => inherit base
  @objc public let italic: NSNumber? // nil => inherit base
  @objc public let decoration: String? // "underline" | "line-through", nil => none

  @objc public init(
    start: Int,
    end: Int,
    color: UIColor?,
    backgroundColor: UIColor?,
    weight: Int,
    fontSize: CGFloat,
    italic: NSNumber?,
    decoration: String?
  ) {
    self.start = start
    self.end = end
    self.color = color
    self.backgroundColor = backgroundColor
    self.weight = weight
    self.fontSize = fontSize
    self.italic = italic
    self.decoration = decoration
  }
}

@objc public class FastTextSpec: NSObject {
  @objc public let text: String
  @objc public let color: UIColor
  @objc public let fontSize: CGFloat
  @objc public let weight: Int
  @objc public let italic: Bool
  @objc public let paddingHorizontal: CGFloat
  @objc public let lineHeight: CGFloat
  @objc public let numberOfLines: Int // 0 => unlimited
  @objc public let textAlign: String // "" => natural
  @objc public let decoration: String? // nil => none
  @objc public let accessibilityText: String
  @objc public let fragments: [FastTextFragmentSpec]

  @objc public init(
    text: String,
    color: UIColor,
    fontSize: CGFloat,
    weight: Int,
    italic: Bool,
    paddingHorizontal: CGFloat,
    lineHeight: CGFloat,
    numberOfLines: Int,
    textAlign: String,
    decoration: String?,
    accessibilityText: String,
    fragments: [FastTextFragmentSpec]
  ) {
    self.text = text
    self.color = color
    self.fontSize = fontSize
    self.weight = weight
    self.italic = italic
    self.paddingHorizontal = paddingHorizontal
    self.lineHeight = lineHeight
    self.numberOfLines = numberOfLines
    self.textAlign = textAlign
    self.decoration = decoration
    self.accessibilityText = accessibilityText
    self.fragments = fragments
  }
}

@objc public class FastTextRenderer: NSObject {
  // Mirrors the Android FastTextView weight->Poppins-family mapping and the web Text
  // primitive's resolveFontFamily; a numeric system weight would synthesize a faux weight
  // off the regular face instead of loading the real Poppins-SemiBold/Bold files.
  @objc public static func font(weight: Int, italic: Bool, size: CGFloat) -> UIFont {
    let bold = weight >= 700
    let semibold = weight >= 500 && weight < 700
    let name: String
    if bold && italic {
      name = "Poppins-BoldItalic"
    } else if bold {
      name = "Poppins-Bold"
    } else if semibold && italic {
      name = "Poppins-SemiBoldItalic"
    } else if semibold {
      name = "Poppins-SemiBold"
    } else if italic {
      name = "Poppins-Italic"
    } else {
      name = "Poppins-Regular"
    }
    return UIFont(name: name, size: size) ?? UIFont.systemFont(ofSize: size)
  }

  private static func addDecoration(_ decoration: String?, to attr: NSMutableAttributedString, range: NSRange) {
    switch decoration {
    case "underline":
      attr.addAttribute(.underlineStyle, value: NSUnderlineStyle.single.rawValue, range: range)
    case "line-through":
      attr.addAttribute(.strikethroughStyle, value: NSUnderlineStyle.single.rawValue, range: range)
    default:
      break
    }
  }

  @objc public static func attributedString(for spec: FastTextSpec) -> NSAttributedString {
    let nsText = spec.text as NSString
    let length = nsText.length
    if length == 0 {
      return NSAttributedString(string: "")
    }

    let baseSize = spec.fontSize > 0 ? spec.fontSize : 16
    let attr = NSMutableAttributedString(string: spec.text)
    let full = NSRange(location: 0, length: length)
    attr.addAttribute(.font, value: font(weight: spec.weight, italic: spec.italic, size: baseSize), range: full)
    attr.addAttribute(.foregroundColor, value: spec.color, range: full)
    addDecoration(spec.decoration, to: attr, range: full)

    let alignment: NSTextAlignment? =
      spec.textAlign == "center" ? .center : spec.textAlign == "right" ? .right : spec.textAlign == "left" ? .left : nil
    if spec.lineHeight > 0 || alignment != nil {
      let paragraphStyle = NSMutableParagraphStyle()
      if spec.lineHeight > 0 {
        paragraphStyle.minimumLineHeight = spec.lineHeight
        paragraphStyle.maximumLineHeight = spec.lineHeight
      }
      if let alignment = alignment {
        paragraphStyle.alignment = alignment
      }
      attr.addAttribute(.paragraphStyle, value: paragraphStyle, range: full)
    }

    // StyledText tracks UTF-16 offsets, which is what NSString length/NSRange use, so the
    // fragment ranges map directly onto the attributed string.
    for fragment in spec.fragments {
      let start = max(0, min(fragment.start, length))
      let end = max(start, min(fragment.end, length))
      if end <= start {
        continue
      }
      let range = NSRange(location: start, length: end - start)
      let weight = fragment.weight != 0 ? fragment.weight : spec.weight
      let size = fragment.fontSize > 0 ? fragment.fontSize : baseSize
      let italic = fragment.italic?.boolValue ?? spec.italic
      attr.addAttribute(.font, value: font(weight: weight, italic: italic, size: size), range: range)
      if let color = fragment.color {
        attr.addAttribute(.foregroundColor, value: color, range: range)
      }
      if let backgroundColor = fragment.backgroundColor {
        attr.addAttribute(.backgroundColor, value: backgroundColor, range: range)
      }
      addDecoration(fragment.decoration, to: attr, range: range)
    }

    return attr
  }

  // TextKit stack used only when numberOfLines > 0: NSStringDrawing has no line-count cap,
  // while NSTextContainer truncates the last visible line with an ellipsis natively.
  private static func makeTruncatingLayout(
    for spec: FastTextSpec,
    width: CGFloat
  ) -> (NSLayoutManager, NSTextContainer, NSTextStorage) {
    let storage = NSTextStorage(attributedString: attributedString(for: spec))
    let manager = NSLayoutManager()
    let container = NSTextContainer(size: CGSize(width: width, height: .greatestFiniteMagnitude))
    container.lineFragmentPadding = 0
    container.maximumNumberOfLines = spec.numberOfLines
    container.lineBreakMode = .byTruncatingTail
    manager.addTextContainer(container)
    storage.addLayoutManager(manager)
    return (manager, container, storage)
  }

  // maxWidth <= 0 means unbounded (the ObjC++ caller passes 0 for Yoga's UNDEFINED width).
  @objc public static func measure(_ spec: FastTextSpec, maxWidth: CGFloat, maxHeight: CGFloat) -> CGSize {
    let padding = spec.paddingHorizontal
    let availableWidth = maxWidth <= 0 ? CGFloat.greatestFiniteMagnitude : max(maxWidth - 2 * padding, 0)
    if spec.numberOfLines > 0 {
      let (manager, container, storage) = makeTruncatingLayout(for: spec, width: availableWidth)
      // NSLayoutManager references its NSTextStorage weakly, so keep it alive through layout.
      return withExtendedLifetime(storage) {
        manager.ensureLayout(for: container)
        let rect = manager.usedRect(for: container)
        return CGSize(width: ceil(rect.width) + 2 * padding, height: ceil(rect.height))
      }
    }
    let attr = attributedString(for: spec)
    let rect = attr.boundingRect(
      with: CGSize(width: availableWidth, height: maxHeight),
      options: .usesLineFragmentOrigin,
      context: nil
    )
    return CGSize(width: ceil(rect.width) + 2 * padding, height: ceil(rect.height))
  }

  @objc public static func draw(_ spec: FastTextSpec, in rect: CGRect) {
    if spec.numberOfLines > 0 {
      let (manager, container, storage) = makeTruncatingLayout(for: spec, width: rect.width)
      withExtendedLifetime(storage) {
        let glyphRange = manager.glyphRange(for: container)
        manager.drawBackground(forGlyphRange: glyphRange, at: rect.origin)
        manager.drawGlyphs(forGlyphRange: glyphRange, at: rect.origin)
      }
      return
    }
    attributedString(for: spec).draw(with: rect, options: .usesLineFragmentOrigin, context: nil)
  }
}

// Auxiliary view set as the component's contentView so drawing happens on top of the layers
// RCTViewComponentView manages (mirrors RCTParagraphComponentView).
@objc public class FastTextContentView: UIView {
  @objc public var spec: FastTextSpec? {
    didSet {
      // RCTViewComponentView delegates -isAccessibilityElement to its contentView, so the
      // drawn text is invisible to VoiceOver unless this view exposes the label itself.
      let label = spec?.accessibilityText ?? ""
      isAccessibilityElement = !label.isEmpty
      accessibilityLabel = label.isEmpty ? nil : label
      setNeedsDisplay()
    }
  }

  override public init(frame: CGRect) {
    super.init(frame: frame)
    isOpaque = false
    contentMode = .redraw
    backgroundColor = .clear
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  public override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
    return nil
  }

  public override func draw(_ rect: CGRect) {
    guard let spec = spec, !spec.text.isEmpty else {
      return
    }
    let padding = spec.paddingHorizontal
    let textRect = CGRect(x: padding, y: 0, width: max(bounds.width - 2 * padding, 0), height: bounds.height)
    FastTextRenderer.draw(spec, in: textRect)
  }
}
