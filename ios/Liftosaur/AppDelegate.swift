import UIKit
import OSLog
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import RollbarNotifier
import GoogleAdsOnDeviceConversion

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let defaults = UserDefaults.standard
    let priorInProgress = defaults.bool(forKey: "LftUpdater.launchInProgress")
    if priorInProgress {
      let count = defaults.integer(forKey: "LftUpdater.crashCount") + 1
      defaults.set(count, forKey: "LftUpdater.crashCount")
      Logger.ota.warning("previous launch did not complete; crashCount=\(count) activeId=\(LftUpdaterPath.activeUpdateId() ?? "<none>")")
      if count >= 3 {
        Logger.ota.error("crashCount reached \(count), reverting to embedded bundle")
        LftUpdaterPath.revertToEmbedded()
        defaults.set(0, forKey: "LftUpdater.crashCount")
      }
    } else {
      Logger.ota.info("launch starting, activeId=\(LftUpdaterPath.activeUpdateId() ?? "<none>")")
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

    RCTFastTextRegistrar.registerComponent()
    RCTLiftoEditorRegistrar.registerComponent()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    return true
  }

  func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
  }

  func applicationWillTerminate(_ application: UIApplication) {
    LiftosaurEventReporterImpl.shared.markGracefulTermination()
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    guard let hostPort = MetroLocation.hostPort() else {
      return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    }
    // jsLocation drives the dev menu, the inspector and Metro-initiated reloads.
    RCTBundleURLProvider.sharedSettings().jsLocation = hostPort
    // The instance method silently falls back to guessing localhost:8081 when the packager isn't up
    // yet, which in a worktree means loading another checkout's JS. The class method has no fallback.
    return RCTBundleURLProvider.jsBundleURL(
      forBundleRoot: "index",
      packagerHost: hostPort,
      enableDev: RCTBundleURLProvider.sharedSettings().enableDev,
      enableMinification: RCTBundleURLProvider.sharedSettings().enableMinification,
      inlineSourceMap: RCTBundleURLProvider.sharedSettings().inlineSourceMap
    )
#elseif DISABLE_OTA
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#else
    return LftUpdaterPath.effectiveBundleURL()
#endif
  }
}

#if DEBUG
// React-Core is a prebuilt xcframework, so RCT_METRO_PORT is fixed at 8081 inside it and every
// worktree would attach to the base repo's Metro. ios/scripts/write-metro-port.sh writes the real
// port into the app bundle at build time.
private enum MetroLocation {
  static func hostPort() -> String? {
    guard let port = bundledString(resource: "metro-port") else { return nil }
#if targetEnvironment(simulator)
    return "localhost:\(port)"
#else
    guard let ip = bundledString(resource: "ip") else { return nil }
    return "\(ip):\(port)"
#endif
  }

  private static func bundledString(resource: String) -> String? {
    guard let url = Bundle.main.url(forResource: resource, withExtension: "txt"),
          let contents = try? String(contentsOf: url, encoding: .utf8) else { return nil }
    let trimmed = contents.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? nil : trimmed
  }
}
#endif
