import UIKit
import React
import TikTokOpenSDKCore
import AppsFlyerLib

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory
    else { return }

    // Cold-start URLs arrive via connectionOptions under the scene lifecycle, but
    // Linking.getInitialURL() on the JS side reads them from launchOptions, so re-pack them.
    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let urlContext = connectionOptions.urlContexts.first {
      launchOptions[.url] = urlContext.url
    }
    if let userActivity = connectionOptions.userActivities.first(where: { $0.activityType == NSUserActivityTypeBrowsingWeb }) {
      launchOptions[.userActivityDictionary] = [
        UIApplication.LaunchOptionsKey.userActivityType.rawValue: userActivity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": userActivity,
      ]
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    factory.startReactNative(
      withModuleName: "Liftosaur",
      in: window,
      launchOptions: launchOptions.isEmpty ? nil : launchOptions
    )

    for context in connectionOptions.urlContexts {
      handleOpen(url: context.url, sourceApplication: context.options.sourceApplication)
    }
    for userActivity in connectionOptions.userActivities {
      handleContinue(userActivity)
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      handleOpen(url: context.url, sourceApplication: context.options.sourceApplication)
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    handleContinue(userActivity)
  }

  private func handleOpen(url: URL, sourceApplication: String?) {
    var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    if let sourceApplication {
      options[.sourceApplication] = sourceApplication
    }
    AppsFlyerLib.shared().handleOpen(url, options: options)
    if TikTokURLHandler.handleOpenURL(url) {
      return
    }
    _ = RCTLinkingManager.application(UIApplication.shared, open: url, options: options)
  }

  private func handleContinue(_ userActivity: NSUserActivity) {
    AppsFlyerLib.shared().continue(userActivity, restorationHandler: nil)
    if TikTokURLHandler.handleOpenURL(userActivity.webpageURL) {
      return
    }
    _ = RCTLinkingManager.application(UIApplication.shared, continue: userActivity) { _ in }
  }
}
