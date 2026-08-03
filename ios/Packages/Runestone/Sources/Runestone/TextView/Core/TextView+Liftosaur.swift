import CoreGraphics
import UIKit

// Liftosaur fork addition: character-index hit-testing for the token-tap flow.
// closestPosition(to:) returns an IndexedPosition, which is internal to the module,
// so the index has to be unwrapped here rather than in the app target.
public extension TextView {
    /// - Parameter point: a point in text-content coordinates (add contentOffset when
    ///   converting from the scroll view's own coordinate space).
    func characterIndex(at point: CGPoint) -> Int? {
        (closestPosition(to: point) as? IndexedPosition)?.index
    }
}
