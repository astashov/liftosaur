import Foundation

class CacheManager {
  static let shared = CacheManager()
  private let cacheDirectory: URL

  init() {
    cacheDirectory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
      .appendingPathComponent("webCache")
    try? FileManager.default.createDirectory(
      at: cacheDirectory, withIntermediateDirectories: true, attributes: nil)
  }

  func clear() {
    guard
      let contents = try? FileManager.default.contentsOfDirectory(
        at: cacheDirectory,
        includingPropertiesForKeys: nil,
        options: .skipsHiddenFiles)
    else { return }
    for file in contents {
      try? FileManager.default.removeItem(at: file)
    }
  }
  
  func cache(for name: String, urlString: String) async -> Bool {
    let cacheFile = cacheDirectory.appendingPathComponent(name)
    let data = await download(from: urlString)
    if let data {
      cacheData(data, for: name)
      return true
    } else {
      return false
    }
  }
  
  func pathTo(name: String) -> URL {
    return cacheDirectory.appendingPathComponent(name)
  }

  func data(for name: String) -> Data? {
    let cacheFile = pathTo(name: name)
    return try? Data(contentsOf: cacheFile)
  }

  func exists(for name: String) -> Bool {
    let cacheFile = pathTo(name: name)
    return FileManager.default.fileExists(atPath: cacheFile.path)
  }

  private func cacheData(_ data: Data, for name: String) {
    let cacheFile = pathTo(name: name)
    try? data.write(to: cacheFile)
  }

  private func download(from urlString: String) async -> Data? {
    guard let url = URL(string: urlString) else { return nil }
    guard let result = try? await URLSession.shared.data(from: url) else { return nil }
    let (data, response) = result
    if let httpResponse = response as? HTTPURLResponse {
      if httpResponse.statusCode == 200 {
        return data
      }
    }
    return nil
  }
}
