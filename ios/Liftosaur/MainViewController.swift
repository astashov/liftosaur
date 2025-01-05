import React_RCTAppDelegate
import UIKit

class MainViewController: UIViewController {

  override func viewDidLoad() {
    super.viewDidLoad()

    Task {
      let result = await maybeDownloadBundle()
      if result {
        loadReactNative()
      }
    }
  }

  private func loadReactNative() {
    let factory = (RCTSharedApplication()?.delegate as? RCTAppDelegate)?.rootViewFactory
    self.view = factory?.view(withModuleName: "Liftosaur")
    
    Task {
      await downloadBundle()
    }
  }

  func maybeDownloadBundle() async -> Bool {
    if !CacheManager.shared.exists(for: "reactnative2.js") {
      return await downloadBundle()
    } else {
      return true
    }
  }
  
  func downloadBundle() async -> Bool {
#if DEBUG
    return true
#else
    return await CacheManager.shared.cache(
      for: "reactnative2.js",
      urlString: "https://local.liftosaur.com:8080/reactnative2.js"
    )
#endif
  }
}
