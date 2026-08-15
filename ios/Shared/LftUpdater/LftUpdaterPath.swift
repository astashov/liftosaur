import Foundation
import OSLog

enum LftUpdaterManifestSource {
  /// Rewritten per stage by scripts/syncUpdatesUrl.ts at deploy time.
  case infoPlist
  /// Follows the host in Settings.swift, so it changes with the build configuration.
  case baseUrl
}

struct LftUpdaterConfig {
  let platform: String
  let bundleFileName: String
  let otaRootName: String
  let embeddedResource: String
  let embeddedExtension: String
  let manifestSource: LftUpdaterManifestSource

  static let phone = LftUpdaterConfig(
    platform: "ios",
    bundleFileName: "main.jsbundle",
    otaRootName: "ota",
    embeddedResource: "main",
    embeddedExtension: "jsbundle",
    manifestSource: .infoPlist
  )

  // The watch follows baseUrl rather than the Info.plist. A Debug phone build loads from Metro,
  // so an update downloaded there is inert — but the watch has no Metro, and whatever it downloads
  // becomes the JS it runs. A production manifest URL in a Debug build would therefore replace the
  // developer's freshly built bundle with production JS, and keep loading it on every later launch.
  static let watch = LftUpdaterConfig(
    platform: "watchos",
    bundleFileName: "watch-bundle.js",
    otaRootName: "watch-ota",
    embeddedResource: "watch-bundle",
    embeddedExtension: "js",
    manifestSource: .baseUrl
  )

  var manifestURL: String {
    switch manifestSource {
    case .infoPlist:
      return (Bundle.main.infoDictionary?["LftUpdatesManifestURL"] as? String)
        ?? "https://www.liftosaur.com/api/updates/manifest"
    case .baseUrl:
      return baseUrl.appendingPathComponent("api/updates/manifest").absoluteString
    }
  }

  var activeUpdateIdKey: String { "LftUpdater.activeUpdateId.\(platform)" }
  var activeRuntimeVersionKey: String { "LftUpdater.activeRuntimeVersion.\(platform)" }
}

@objc class LftUpdaterPath: NSObject {
  static let phone = LftUpdaterPath(config: .phone)
  static let watch = LftUpdaterPath(config: .watch)

  let config: LftUpdaterConfig

  init(config: LftUpdaterConfig) {
    self.config = config
    super.init()
  }

  static func runtimeVersion() -> String {
    Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0"
  }

  var otaRoot: URL {
    FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
      .appendingPathComponent(config.otaRootName)
  }

  var activeBundleURL: URL {
    otaRoot.appendingPathComponent("active/\(config.bundleFileName)")
  }

  var embeddedBundleURL: URL? {
    Bundle.main.url(forResource: config.embeddedResource, withExtension: config.embeddedExtension)
  }

  func effectiveBundleURL() -> URL? {
    let active = activeBundleURL
    if FileManager.default.fileExists(atPath: active.path) {
      // Documents/ survives app updates, so an update downloaded for the previous binary is
      // still sitting here after an App Store upgrade. Launching it would run the old release's
      // JS against new native code — exactly when the bridge contract is most likely to differ.
      let current = LftUpdaterPath.runtimeVersion()
      let stored = activeRuntimeVersion()
      if stored != current {
        Logger.ota.warning(
          "discarding active bundle built for runtimeVersion \(stored ?? "<none>") (now \(current))")
        revertToEmbedded()
      } else {
        Logger.ota.info(
          "effectiveBundleURL: using OTA bundle at \(active.path) (id=\(self.activeUpdateId() ?? "<none>"))")
        return active
      }
    }
    let embedded = embeddedBundleURL
    Logger.ota.info("effectiveBundleURL: using embedded bundle (\(embedded?.lastPathComponent ?? "<missing>"))")
    return embedded
  }

  func activeUpdateId() -> String? {
    UserDefaults.standard.string(forKey: config.activeUpdateIdKey)
  }

  func activeRuntimeVersion() -> String? {
    UserDefaults.standard.string(forKey: config.activeRuntimeVersionKey)
  }

  func setActive(updateId: String, runtimeVersion: String, bundleFile: URL) throws {
    let fm = FileManager.default
    let root = otaRoot
    let active = root.appendingPathComponent("active")
    let staging = root.appendingPathComponent("staging-\(updateId)")
    try? fm.createDirectory(at: root, withIntermediateDirectories: true)
    try? fm.removeItem(at: staging)
    try fm.createDirectory(at: staging, withIntermediateDirectories: true)
    let dest = staging.appendingPathComponent(config.bundleFileName)
    try fm.copyItem(at: bundleFile, to: dest)
    let hadPrevious = fm.fileExists(atPath: active.path)
    if hadPrevious {
      try fm.removeItem(at: active)
    }
    try fm.moveItem(at: staging, to: active)
    UserDefaults.standard.set(updateId, forKey: config.activeUpdateIdKey)
    UserDefaults.standard.set(runtimeVersion, forKey: config.activeRuntimeVersionKey)
    Logger.ota.info(
      "setActive: id=\(updateId) rv=\(runtimeVersion) replacedPrevious=\(hadPrevious) path=\(active.path)")
  }

  func revertToEmbedded() {
    let fm = FileManager.default
    let active = otaRoot.appendingPathComponent("active")
    let hadActive = fm.fileExists(atPath: active.path)
    if hadActive {
      try? fm.removeItem(at: active)
    }
    UserDefaults.standard.removeObject(forKey: config.activeUpdateIdKey)
    UserDefaults.standard.removeObject(forKey: config.activeRuntimeVersionKey)
    Logger.ota.info("revertToEmbedded: hadActive=\(hadActive)")
  }

  // MARK: ObjC surface used by the iOS app (AppDelegate)

  @objc static func effectiveBundleURL() -> URL? {
    phone.effectiveBundleURL()
  }

  @objc static func activeUpdateId() -> String? {
    phone.activeUpdateId()
  }

  @objc static func revertToEmbedded() {
    phone.revertToEmbedded()
  }
}
