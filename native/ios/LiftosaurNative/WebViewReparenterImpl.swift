import UIKit
import os

private let logger = Logger(subsystem: "com.liftosaur.www", category: "Reparenter")

@objc class WebViewReparenterImpl: NSObject {
  @objc static let shared = WebViewReparenterImpl()

  @objc func reparent(childNativeID: String, newParentNativeID: String, completion: @escaping (Bool) -> Void) {
    DispatchQueue.main.async {
      guard let rootView = UIApplication.shared.keyWindow?.rootViewController?.view else {
        logger.error("reparent: no root view")
        completion(false)
        return
      }

      let child = Self.findView(withNativeID: childNativeID, in: rootView)
      let newParent = Self.findView(withNativeID: newParentNativeID, in: rootView)

      logger.info("reparent: child=\(childNativeID) found=\(child != nil), parent=\(newParentNativeID) found=\(newParent != nil)")

      guard let child, let newParent else {
        completion(false)
        return
      }

      if child === newParent {
        logger.error("reparent: child and parent are the same view")
        completion(false)
        return
      }

      if newParent.isDescendant(of: child) {
        logger.error("reparent: parent is a descendant of child")
        completion(false)
        return
      }

      logger.info("reparent: parent bounds=\(newParent.bounds.debugDescription), child class=\(type(of: child)), parent class=\(type(of: newParent))")
      child.removeFromSuperview()
      child.frame = newParent.bounds
      child.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      newParent.addSubview(child)

      completion(true)
    }
  }

  @objc func dumpViewHierarchy(completion: @escaping (String) -> Void) {
    DispatchQueue.main.async {
      guard let rootView = UIApplication.shared.keyWindow?.rootViewController?.view else {
        completion("no root view")
        return
      }
      var result = ""
      Self.dumpView(rootView, indent: 0, result: &result)
      completion(result)
    }
  }

  private static func dumpView(_ view: UIView, indent: Int, result: inout String) {
    let prefix = String(repeating: "  ", count: indent)
    let aid = view.accessibilityIdentifier ?? "-"
    var nid = "-"
    if view.responds(to: Selector(("nativeId"))) {
      nid = (view.value(forKey: "nativeId") as? String) ?? "-"
    }
    result += "\(prefix)\(type(of: view)) aid=\(aid) nid=\(nid) f=\(Int(view.frame.width))x\(Int(view.frame.height))\n"
    for subview in view.subviews {
      dumpView(subview, indent: indent + 1, result: &result)
    }
  }

  private static func findView(withNativeID nativeID: String, in view: UIView) -> UIView? {
    if view.responds(to: Selector(("nativeId"))),
       let viewNativeId = view.value(forKey: "nativeId") as? String,
       viewNativeId == nativeID {
      return view
    }
    for subview in view.subviews {
      if let found = findView(withNativeID: nativeID, in: subview) {
        return found
      }
    }
    return nil
  }
}
