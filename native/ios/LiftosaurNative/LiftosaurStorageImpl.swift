import Foundation

@objc class LiftosaurStorageImpl: NSObject {
  @objc static let shared = LiftosaurStorageImpl()

  private static let storageQueue = DispatchQueue(label: "com.liftosaur.storage")
  private let storageDirectory: URL

  override init() {
    storageDirectory = FileManager.default.urls(
      for: .documentDirectory, in: .userDomainMask
    ).first!.appendingPathComponent("LiftosaurStorage")
    try? FileManager.default.createDirectory(at: storageDirectory, withIntermediateDirectories: true, attributes: nil)
    super.init()
  }

  private func sanitizeKey(_ key: String) -> String {
    return key.replacingOccurrences(of: "/", with: "_")
              .replacingOccurrences(of: "\\", with: "_")
              .replacingOccurrences(of: ":", with: "_")
              .replacingOccurrences(of: "*", with: "_")
              .replacingOccurrences(of: "?", with: "_")
              .replacingOccurrences(of: "\"", with: "_")
              .replacingOccurrences(of: "<", with: "_")
              .replacingOccurrences(of: ">", with: "_")
              .replacingOccurrences(of: "|", with: "_")
  }

  private func fileForKey(_ key: String) -> URL {
    let sanitizedKey = sanitizeKey(key)
    return storageDirectory.appendingPathComponent("\(sanitizedKey).json")
  }

  @objc func getValue(_ key: String, completion: @escaping (String?) -> Void) {
    Self.storageQueue.async {
      let file = self.fileForKey(key)
      do {
        let data = try Data(contentsOf: file)
        completion(String(data: data, encoding: .utf8))
      } catch {
        completion(nil)
      }
    }
  }

  @objc func setValue(_ key: String, value: String, completion: @escaping (Bool) -> Void) {
    Self.storageQueue.async {
      let file = self.fileForKey(key)
      guard let data = value.data(using: .utf8) else {
        completion(false)
        return
      }
      do {
        try data.write(to: file, options: .atomic)
        completion(true)
      } catch {
        completion(false)
      }
    }
  }

  @objc func deleteValue(_ key: String, completion: @escaping (Bool) -> Void) {
    Self.storageQueue.async {
      let file = self.fileForKey(key)
      do {
        try FileManager.default.removeItem(at: file)
        completion(true)
      } catch {
        completion(false)
      }
    }
  }

  @objc func hasValue(_ key: String, completion: @escaping (Bool) -> Void) {
    Self.storageQueue.async {
      let file = self.fileForKey(key)
      completion(FileManager.default.fileExists(atPath: file.path))
    }
  }

  @objc func getAllKeys(_ completion: @escaping ([String]) -> Void) {
    Self.storageQueue.async {
      do {
        let files = try FileManager.default.contentsOfDirectory(
          at: self.storageDirectory, includingPropertiesForKeys: nil, options: .skipsHiddenFiles
        )
        let keys = files.compactMap { url -> String? in
          let name = url.lastPathComponent
          return name.hasSuffix(".json") ? String(name.dropLast(5)) : nil
        }
        completion(keys)
      } catch {
        completion([])
      }
    }
  }

  @objc func readFile(_ path: String, completion: @escaping (String?) -> Void) {
    Self.storageQueue.async {
      guard let url = URL(string: path) else {
        completion(nil)
        return
      }
      do {
        let data = try Data(contentsOf: url)
        completion(String(data: data, encoding: .utf8))
      } catch {
        completion(nil)
      }
    }
  }
}
