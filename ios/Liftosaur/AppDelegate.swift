import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import TikTokOpenSDKCore
import RollbarNotifier
import GoogleAdsOnDeviceConversion
import AppsFlyerLib

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let defaults = UserDefaults.standard
    if defaults.bool(forKey: "LftUpdater.launchInProgress") {
      let count = defaults.integer(forKey: "LftUpdater.crashCount") + 1
      defaults.set(count, forKey: "LftUpdater.crashCount")
      if count >= 3 {
        LftUpdaterPath.revertToEmbedded()
        defaults.set(0, forKey: "LftUpdater.crashCount")
      }
    }
    defaults.set(true, forKey: "LftUpdater.launchInProgress")

    LiftosaurEventReporterImpl.shared.registerWithMetricKit()
    _ = LiftosaurWorkoutMirroringImpl.shared

    if let cachedUserId = UserDefaults.standard.string(forKey: "LiftosaurCachedUserId") {
      let config = Rollbar.configuration().mutableCopy()
      config.setPersonId(cachedUserId, username: nil, email: nil)
      Rollbar.update(withConfiguration: config)
    }

    ConversionManager.sharedInstance.setFirstLaunchTime(Date())

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "Liftosaur",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  func applicationWillTerminate(_ application: UIApplication) {
    LiftosaurEventReporterImpl.shared.markGracefulTermination()
  }

  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    AppsFlyerLib.shared().handleOpen(url, options: options)
    if TikTokURLHandler.handleOpenURL(url) {
      return true
    }
    if RCTLinkingManager.application(app, open: url, options: options) {
      return true
    }
    return false
  }

  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    AppsFlyerLib.shared().continue(userActivity, restorationHandler: nil)
    if TikTokURLHandler.handleOpenURL(userActivity.webpageURL) {
      return true
    }
    if RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler) {
      return true
    }
    return false
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    LftUpdaterPath.effectiveBundleURL()
#endif
  }
}
