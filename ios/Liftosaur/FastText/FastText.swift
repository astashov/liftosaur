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

  @objc public init(
    start: Int,
    end: Int,
    color: UIColor?,
    backgroundColor: UIColor?,
    weight: Int,
    fontSize: CGFloat,
    italic: NSNumber?
  ) {
    self.start = start
    self.end = end
    self.color = color
    self.backgroundColor = backgroundColor
    self.weight = weight
    self.fontSize = fontSize
    self.italic = italic
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

    if spec.lineHeight > 0 {
      let paragraphStyle = NSMutableParagraphStyle()
      paragraphStyle.minimumLineHeight = spec.lineHeight
      paragraphStyle.maximumLineHeight = spec.lineHeight
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
    }

    return attr
  }

  // maxWidth <= 0 means unbounded (the ObjC++ caller passes 0 for Yoga's UNDEFINED width).
  @objc public static func measure(_ spec: FastTextSpec, maxWidth: CGFloat, maxHeight: CGFloat) -> CGSize {
    let attr = attributedString(for: spec)
    let padding = spec.paddingHorizontal
    let availableWidth = maxWidth <= 0 ? CGFloat.greatestFiniteMagnitude : max(maxWidth - 2 * padding, 0)
    let rect = attr.boundingRect(
      with: CGSize(width: availableWidth, height: maxHeight),
      options: .usesLineFragmentOrigin,
      context: nil
    )
    return CGSize(width: ceil(rect.width) + 2 * padding, height: ceil(rect.height))
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
    FastTextRenderer.attributedString(for: spec).draw(
      with: textRect,
      options: .usesLineFragmentOrigin,
      context: nil
    )
  }
}
