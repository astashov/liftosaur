import Foundation
import UIKit

// Liftosaur fork addition. Reads pre-computed styled ranges from ExternalRangesStore and
// applies them to a single line's attributed string. Store lookup is in-memory and cheap,
// so the async variant highlights synchronously too — no operation queue needed.

final class ExternalRangesSyntaxHighlighter: LineSyntaxHighlighter {
    var theme: Theme = DefaultTheme()
    var kern: CGFloat = 0
    var canHighlight: Bool {
        true
    }

    private let store: ExternalRangesStore

    init(store: ExternalRangesStore) {
        self.store = store
    }

    func syntaxHighlight(_ input: LineSyntaxHighlighterInput) {
        let lineRange = NSRange(input.byteRange)
        let attributedString = input.attributedString
        attributedString.beginEditing()
        for styledRange in store.ranges(intersecting: lineRange) {
            let globalRange = NSIntersectionRange(styledRange.range, lineRange)
            let localRange = NSRange(location: globalRange.location - lineRange.location, length: globalRange.length)
            if localRange.length == 0 || localRange.upperBound > attributedString.length {
                continue
            }
            var attributes: [NSAttributedString.Key: Any] = [:]
            if let color = styledRange.color {
                attributes[.foregroundColor] = color
            }
            if let backgroundColor = styledRange.backgroundColor {
                attributes[.backgroundColor] = backgroundColor
            }
            var symbolicTraits: UIFontDescriptor.SymbolicTraits = []
            if styledRange.isBold {
                symbolicTraits.insert(.traitBold)
            }
            if styledRange.isItalic {
                symbolicTraits.insert(.traitItalic)
            }
            if !symbolicTraits.isEmpty {
                let baseFont = (attributedString.attribute(.font, at: localRange.location, effectiveRange: nil) as? UIFont) ?? theme.font
                if let descriptor = baseFont.fontDescriptor.withSymbolicTraits(symbolicTraits) {
                    attributes[.font] = UIFont(descriptor: descriptor, size: baseFont.pointSize)
                }
            }
            if !attributes.isEmpty {
                attributedString.addAttributes(attributes, range: localRange)
            }
        }
        attributedString.endEditing()
    }

    func syntaxHighlight(_ input: LineSyntaxHighlighterInput, completion: @escaping AsyncCallback) {
        syntaxHighlight(input)
        completion(.success(()))
    }

    func cancel() {}
}
