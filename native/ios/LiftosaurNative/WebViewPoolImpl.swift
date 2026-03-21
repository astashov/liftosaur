import UIKit
import WebKit
import os

private let logger = Logger(subsystem: "com.liftosaur.www", category: "WebViewPool")

private class WebViewSlot {
  let id: Int
  let webView: WKWebView
  var status: String  // "loading", "idle", "acquired"

  init(id: Int, webView: WKWebView) {
    self.id = id
    self.webView = webView
    self.status = "loading"
  }
}

private class PoolMessageHandler: NSObject, WKScriptMessageHandler {
  let slotId: Int
  var onMessage: ((Int, String) -> Void)?

  init(slotId: Int) {
    self.slotId = slotId
  }

  func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
    guard let body = message.body as? String else { return }
    onMessage?(slotId, body)
  }
}

private class PoolNavigationDelegate: NSObject, WKNavigationDelegate {
  weak var pool: WebViewPoolImpl?

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    pool?.handleLoadEnd(webView: webView)
  }

  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    pool?.handleLoadFail(webView: webView, error: error)
  }
}

@objc class WebViewPoolImpl: NSObject {
  @objc static let shared = WebViewPoolImpl()

  private var slots: [WebViewSlot] = []
  private var acquireWaiters: [(Int) -> Void] = []
  private var navigationDelegate: PoolNavigationDelegate?
  @objc var onMessage: ((Int, String) -> Void)?

  @objc func setup(url: String, poolSize: Int) {
    DispatchQueue.main.async {
      guard self.slots.isEmpty else { return }

      let navDelegate = PoolNavigationDelegate()
      navDelegate.pool = self
      self.navigationDelegate = navDelegate

      for i in 0..<poolSize {
        let handler = PoolMessageHandler(slotId: i)
        handler.onMessage = { [weak self] slotId, data in
          self?.onMessage?(slotId, data)
        }

        let config = WKWebViewConfiguration()
        let polyfill = WKUserScript(
          source: """
            window.ReactNativeWebView = {
              postMessage: function(data) {
                window.webkit.messageHandlers.liftosaur.postMessage(data);
              }
            };
            """,
          injectionTime: .atDocumentStart,
          forMainFrameOnly: true
        )
        config.userContentController.addUserScript(polyfill)
        config.userContentController.add(handler, name: "liftosaur")

        let webView = WKWebView(frame: .zero, configuration: config)
        #if DEBUG
        if #available(iOS 16.4, *) {
          webView.isInspectable = true
        }
        #endif
        webView.navigationDelegate = navDelegate
        if let requestUrl = URL(string: url) {
          webView.load(URLRequest(url: requestUrl))
        }

        self.slots.append(WebViewSlot(id: i, webView: webView))
        logger.info("Created slot \(i)")
      }
    }
  }

  @objc func acquire(completion: @escaping (Int) -> Void) {
    DispatchQueue.main.async {
      if let slot = self.slots.first(where: { $0.status == "idle" }) {
        slot.status = "acquired"
        logger.info("Acquired slot \(slot.id)")
        completion(slot.id)
      } else {
        logger.info("No idle slots, queuing waiter")
        self.acquireWaiters.append(completion)
      }
    }
  }

  @objc func attach(slotId: Int, targetNativeID: String, completion: @escaping (Bool) -> Void) {
    DispatchQueue.main.async {
      guard let slot = self.slots.first(where: { $0.id == slotId }) else {
        completion(false)
        return
      }
      guard let rootView = UIApplication.shared.keyWindow?.rootViewController?.view else {
        logger.error("attach: no root view")
        completion(false)
        return
      }
      guard let targetView = Self.findView(withNativeID: targetNativeID, in: rootView) else {
        logger.info("attach: target view '\(targetNativeID)' not found")
        completion(false)
        return
      }

      slot.webView.removeFromSuperview()
      slot.webView.frame = targetView.bounds
      slot.webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      targetView.addSubview(slot.webView)
      logger.info("Attached slot \(slotId) to '\(targetNativeID)'")
      completion(true)
    }
  }

  @objc func releaseSlot(slotId: Int) {
    DispatchQueue.main.async {
      guard let slot = self.slots.first(where: { $0.id == slotId }) else { return }
      slot.webView.removeFromSuperview()
      slot.status = "idle"
      logger.info("Released slot \(slotId)")
      self.notifyWaiters()
    }
  }

  @objc func injectJavaScript(slotId: Int, js: String) {
    DispatchQueue.main.async {
      guard let slot = self.slots.first(where: { $0.id == slotId }) else { return }
      slot.webView.evaluateJavaScript(js) { _, error in
        if let error {
          logger.error("JS error in slot \(slotId): \(error.localizedDescription)")
        }
      }
    }
  }

  func handleLoadEnd(webView: WKWebView) {
    guard let slot = slots.first(where: { $0.webView === webView }) else { return }
    if slot.status == "loading" {
      slot.status = "idle"
      logger.info("Slot \(slot.id) loaded, now idle")
      notifyWaiters()
    }
  }

  func handleLoadFail(webView: WKWebView, error: Error) {
    guard let slot = slots.first(where: { $0.webView === webView }) else { return }
    logger.error("Slot \(slot.id) navigation failed: \(error.localizedDescription)")
    if slot.status == "loading" {
      slot.status = "idle"
      notifyWaiters()
    }
  }

  private func notifyWaiters() {
    while !acquireWaiters.isEmpty {
      guard let slot = slots.first(where: { $0.status == "idle" }) else { break }
      slot.status = "acquired"
      let waiter = acquireWaiters.removeFirst()
      logger.info("Fulfilled waiter with slot \(slot.id)")
      waiter(slot.id)
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
