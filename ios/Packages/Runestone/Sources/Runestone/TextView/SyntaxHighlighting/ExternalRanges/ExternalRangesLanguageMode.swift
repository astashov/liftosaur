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

    // Delta protocol: replaces stored ranges whose start falls in [windowStart, windowEnd)
    // with the given ones (sorted, all inside the window), so per-keystroke updates carry
    // only the edited region. Ranges outside the window were already aligned by applyEdit.
    public func applyPatch(windowStart: Int, windowEnd: Int, ranges newRanges: [ExternalStyledRange]) {
        lock.lock()
        var result: [ExternalStyledRange] = []
        result.reserveCapacity(ranges.count + newRanges.count)
        var inserted = false
        for styledRange in ranges {
            let location = styledRange.range.location
            if location >= windowStart && location < windowEnd {
                continue
            }
            if location >= windowEnd && !inserted {
                result.append(contentsOf: newRanges)
                inserted = true
            }
            result.append(styledRange)
        }
        if !inserted {
            result.append(contentsOf: newRanges)
        }
        ranges = result
        lock.unlock()
    }

    // Shifts stored ranges for an edit so the line repaint that happens before the host
    // pushes freshly computed ranges (an async JS round trip) stays aligned instead of
    // flashing stale colors. Precision inside the edited range doesn't matter — the next
    // setRanges or patch replaces the edit's neighborhood.
    public func applyEdit(in editRange: NSRange, replacementLength: Int) {
        let delta = replacementLength - editRange.length
        if delta == 0 {
            return
        }
        lock.lock()
        ranges = ranges.compactMap { styledRange in
            var location = styledRange.range.location
            var length = styledRange.range.length
            if editRange.upperBound <= location {
                location += delta
            } else if editRange.location < location + length {
                length = max(0, length + delta)
            }
            if length == 0 {
                return nil
            }
            return ExternalStyledRange(
                range: NSRange(location: location, length: length),
                color: styledRange.color,
                backgroundColor: styledRange.backgroundColor,
                isBold: styledRange.isBold,
                isItalic: styledRange.isItalic
            )
        }
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
