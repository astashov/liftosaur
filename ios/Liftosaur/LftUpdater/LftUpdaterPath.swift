import Foundation

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
      return active
    }
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
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
    if fm.fileExists(atPath: active.path) {
      try fm.removeItem(at: active)
    }
    try fm.moveItem(at: staging, to: active)
    UserDefaults.standard.set(updateId, forKey: activeUpdateIdKey)
  }

  @objc static func revertToEmbedded() {
    let fm = FileManager.default
    let active = otaRoot.appendingPathComponent("active")
    if fm.fileExists(atPath: active.path) {
      try? fm.removeItem(at: active)
    }
    UserDefaults.standard.removeObject(forKey: activeUpdateIdKey)
  }
}
