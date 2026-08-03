import Foundation
import UIKit

// Liftosaur fork addition. A language mode whose highlighting comes from externally
// computed styled ranges (a Lezer parse running on the React Native JS thread) instead
// of tree-sitter. The host pushes new ranges into the store after each async parse and
// calls TextView.redisplayVisibleLines() to repaint.

public struct ExternalStyledRange {
    public let range: NSRange
    public let color: UIColor?
    public let backgroundColor: UIColor?
    public let isBold: Bool
    public let isItalic: Bool

    public init(range: NSRange, color: UIColor?, backgroundColor: UIColor? = nil, isBold: Bool = false, isItalic: Bool = false) {
        self.range = range
        self.color = color
        self.backgroundColor = backgroundColor
        self.isBold = isBold
        self.isItalic = isItalic
    }
}

public final class ExternalRangesStore {
    private var ranges: [ExternalStyledRange] = []
    private let lock = NSLock()

    public init() {}

    public func setRanges(_ newRanges: [ExternalStyledRange]) {
        lock.lock()
        ranges = newRanges.sorted { $0.range.location < $1.range.location }
        lock.unlock()
    }

    func ranges(intersecting lineRange: NSRange) -> [ExternalStyledRange] {
        lock.lock()
        defer { lock.unlock() }
        var result: [ExternalStyledRange] = []
        for styledRange in ranges {
            if styledRange.range.location >= lineRange.upperBound {
                break
            }
            if NSIntersectionRange(styledRange.range, lineRange).length > 0 {
                result.append(styledRange)
            }
        }
        return result
    }
}

public final class ExternalRangesLanguageMode: LanguageMode {
    public let store: ExternalRangesStore

    public init(store: ExternalRangesStore) {
        self.store = store
    }
}
