import UIKit

// Draws a circle under every finger, for screen recordings. On when the build was made with
// SHOW_TOUCHES=1 (ios/ShowTouches.xcconfig), or when the LiftosaurShowTouches default is set:
// `xcrun simctl spawn <udid> defaults write com.liftosaur.www LiftosaurShowTouches -bool true`.
final class TouchIndicatorWindow: UIWindow {
  static let defaultsKey = "LiftosaurShowTouches"
  private static let diameter: CGFloat = 44

  static var isEnabled: Bool {
#if SHOW_TOUCHES
    return true
#else
    return UserDefaults.standard.bool(forKey: defaultsKey)
#endif
  }

  private var indicators: [ObjectIdentifier: UIView] = [:]

  override func sendEvent(_ event: UIEvent) {
    super.sendEvent(event)
    guard event.type == .touches, let touches = event.allTouches else { return }
    for touch in touches {
      let location = touch.location(in: self)
      switch touch.phase {
      case .began:
        show(touch, at: location)
      case .moved, .stationary:
        indicators[ObjectIdentifier(touch)]?.center = location
      case .ended, .cancelled:
        hide(touch, at: location)
      default:
        break
      }
    }
  }

  private func show(_ touch: UITouch, at location: CGPoint) {
    let size = Self.diameter
    let view = UIView(frame: CGRect(x: 0, y: 0, width: size, height: size))
    view.center = location
    view.layer.cornerRadius = size / 2
    view.backgroundColor = UIColor(red: 0.55, green: 0.36, blue: 0.96, alpha: 0.45)
    view.layer.borderColor = UIColor.white.withAlphaComponent(0.9).cgColor
    view.layer.borderWidth = 2
    view.isUserInteractionEnabled = false
    view.transform = CGAffineTransform(scaleX: 0.6, y: 0.6)
    addSubview(view)
    indicators[ObjectIdentifier(touch)] = view
    UIView.animate(withDuration: 0.12) {
      view.transform = .identity
    }
  }

  private func hide(_ touch: UITouch, at location: CGPoint) {
    guard let view = indicators.removeValue(forKey: ObjectIdentifier(touch)) else { return }
    view.center = location
    UIView.animate(
      withDuration: 0.25,
      animations: {
        view.alpha = 0
        view.transform = CGAffineTransform(scaleX: 1.4, y: 1.4)
      },
      completion: { _ in view.removeFromSuperview() }
    )
  }
}
