import UIKit
import React
import React_RCTAppDelegate

@objc(AppDelegate)
public class AppDelegate: RCTAppDelegate {

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    self.automaticallyLoadReactNativeWindow = false
    super.application(application, didFinishLaunchingWithOptions: launchOptions)
    window = UIWindow()
    window.rootViewController = MainViewController()
    window.makeKeyAndVisible()
    return true
  }

  public override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  public override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    CacheManager.shared.pathTo(name: "reactnative2.js")
#endif
  }
}
