import Foundation
import OSLog

@objc class LftUpdaterPath: NSObject {
  private static let activeUpdateIdKey = "LftUpdater.activeUpdateId"

  static var otaRoot: URL {
    FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("ota")
  }

  static var activeBundleURL: URL {
    otaRoot.appendingPathComponent("active/main.jsbundle")
  }

  @objc static func effectiveBundleURL() -> URL? {
    let active = activeBundleURL
    if FileManager.default.fileExists(atPath: active.path) {
      Logger.ota.info("effectiveBundleURL: using OTA bundle at \(active.path) (id=\(activeUpdateId() ?? "<none>"))")
      return active
    }
    let embedded = Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    Logger.ota.info("effectiveBundleURL: using embedded bundle (\(embedded?.lastPathComponent ?? "<missing>"))")
    return embedded
  }

  @objc static func activeUpdateId() -> String? {
    UserDefaults.standard.string(forKey: activeUpdateIdKey)
  }

  static func setActive(updateId: String, bundleFile: URL) throws {
    let fm = FileManager.default
    let root = otaRoot
    let active = root.appendingPathComponent("active")
    let staging = root.appendingPathComponent("staging-\(updateId)")
    try? fm.createDirectory(at: root, withIntermediateDirectories: true)
    try? fm.removeItem(at: staging)
    try fm.createDirectory(at: staging, withIntermediateDirectories: true)
    let dest = staging.appendingPathComponent("main.jsbundle")
    try fm.copyItem(at: bundleFile, to: dest)
    let hadPrevious = fm.fileExists(atPath: active.path)
    if hadPrevious {
      try fm.removeItem(at: active)
    }
    try fm.moveItem(at: staging, to: active)
    UserDefaults.standard.set(updateId, forKey: activeUpdateIdKey)
    Logger.ota.info("setActive: id=\(updateId) replacedPrevious=\(hadPrevious) path=\(active.path)")
  }

  @objc static func revertToEmbedded() {
    let fm = FileManager.default
    let active = otaRoot.appendingPathComponent("active")
    let hadActive = fm.fileExists(atPath: active.path)
    if hadActive {
      try? fm.removeItem(at: active)
    }
    UserDefaults.standard.removeObject(forKey: activeUpdateIdKey)
    Logger.ota.info("revertToEmbedded: hadActive=\(hadActive)")
  }
}
