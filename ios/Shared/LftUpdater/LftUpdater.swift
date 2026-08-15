import Foundation
import CryptoKit
import OSLog

struct LftUpdaterOutcome {
  let success: Bool
  let didUpdate: Bool
  let updateId: String?
}

@objc class LftUpdater: NSObject {
  @objc static let shared = LftUpdater(paths: LftUpdaterPath.phone)
  static let watch = LftUpdater(paths: LftUpdaterPath.watch)

  private static let channel = "production"

  private let paths: LftUpdaterPath

  init(paths: LftUpdaterPath) {
    self.paths = paths
    super.init()
  }

  private var manifestURL: String { paths.config.manifestURL }

  @objc func checkAndDownload(completion: @escaping (String) -> Void) {
#if DISABLE_OTA
    Logger.ota.info("OTA disabled at build time; checkAndDownload is a no-op")
    completion("{\"status\":\"no-update\"}")
#else
    Logger.ota.info("checkAndDownload called (active=\(paths.activeUpdateId() ?? "<none>"))")
    Task {
      do {
        let dict = try await self.performCheckAndDownload()
        let data = try JSONSerialization.data(withJSONObject: dict, options: [])
        Logger.ota.info("checkAndDownload result: \(String(data: data, encoding: .utf8) ?? "{}")")
        completion(String(data: data, encoding: .utf8) ?? "{}")
      } catch {
        Logger.ota.error("checkAndDownload threw: \(error.localizedDescription)")
        let payload: [String: Any] = ["status": "error", "error": error.localizedDescription]
        let data = (try? JSONSerialization.data(withJSONObject: payload, options: [])) ?? Data()
        completion(String(data: data, encoding: .utf8) ?? "{}")
      }
    }
#endif
  }

  /// Async entry point used by the watch app, which drives OTA directly from Swift instead of
  /// through the JS bridge.
  func checkAndDownload() async -> LftUpdaterOutcome {
#if DISABLE_OTA
    Logger.ota.info("OTA disabled at build time; checkAndDownload is a no-op")
    return LftUpdaterOutcome(success: true, didUpdate: false, updateId: nil)
#else
    do {
      let dict = try await performCheckAndDownload()
      let status = dict["status"] as? String
      return LftUpdaterOutcome(
        success: true,
        didUpdate: status == "updated",
        updateId: dict["updateId"] as? String
      )
    } catch {
      Logger.ota.error("checkAndDownload threw: \(error.localizedDescription)")
      return LftUpdaterOutcome(success: false, didUpdate: false, updateId: nil)
    }
#endif
  }

  @objc func markLaunchSuccessful() {
    let d = UserDefaults.standard
    let hadCount = d.integer(forKey: "LftUpdater.crashCount")
    d.set(false, forKey: "LftUpdater.launchInProgress")
    d.set(0, forKey: "LftUpdater.crashCount")
    Logger.ota.info("markLaunchSuccessful (crashCount was \(hadCount))")
  }

  @objc func activeBundleId() -> String? {
    return paths.activeUpdateId()
  }

  @objc func revertToEmbedded() {
    Logger.ota.warning("revertToEmbedded called (was active=\(paths.activeUpdateId() ?? "<none>"))")
    paths.revertToEmbedded()
  }

  private struct Manifest: Decodable {
    let id: String
    let runtimeVersion: String
    let launchAsset: Asset
    struct Asset: Decodable {
      let hash: String
      let url: String
    }
  }

  private struct Directive: Decodable {
    let type: String
  }

  private struct MultipartPart {
    let name: String
    let headers: [String: String]
    let body: Data
  }

  private func performCheckAndDownload() async throws -> [String: Any] {
    let runtimeVersion = LftUpdaterPath.runtimeVersion()
    let platform = paths.config.platform
    Logger.ota.info(
      "fetching manifest: url=\(manifestURL) platform=\(platform) rv=\(runtimeVersion) channel=\(Self.channel)")
    var req = URLRequest(url: URL(string: manifestURL)!)
    req.httpMethod = "GET"
    req.setValue("1", forHTTPHeaderField: "expo-protocol-version")
    req.setValue(platform, forHTTPHeaderField: "expo-platform")
    req.setValue(runtimeVersion, forHTTPHeaderField: "expo-runtime-version")
    req.setValue(Self.channel, forHTTPHeaderField: "expo-channel-name")
    req.setValue("true", forHTTPHeaderField: "expo-expect-signature")

    let (data, response) = try await URLSession.shared.data(for: req)
    guard let http = response as? HTTPURLResponse else {
      throw err("not an http response")
    }
    Logger.ota.info("manifest http=\(http.statusCode) bytes=\(data.count)")
    guard http.statusCode == 200 else {
      throw err("manifest http \(http.statusCode)")
    }
    guard let contentType = http.value(forHTTPHeaderField: "Content-Type"),
          let boundary = Self.extractBoundary(contentType) else {
      throw err("invalid content-type")
    }

    let parts = try Self.parseMultipart(body: data, boundary: boundary)
    Logger.ota.info("parsed multipart: parts=\(parts.count) names=\(parts.map { $0.name }.joined(separator: ","))")
    guard let first = parts.first else { throw err("empty multipart") }
    let signature = try Self.parseSignatureHeader(first.headers["expo-signature"] ?? "")
    try Self.verifyRSASHA256(body: first.body, signatureBase64: signature)
    Logger.ota.info("signature verified for part name=\(first.name)")

    if first.name == "directive" {
      let directive = try JSONDecoder().decode(Directive.self, from: first.body)
      Logger.ota.info("directive: \(directive.type)")
      if directive.type == "rollBackToEmbedded" {
        paths.revertToEmbedded()
      }
      return ["status": "no-update"]
    }

    let manifest = try JSONDecoder().decode(Manifest.self, from: first.body)
    Logger.ota.info("manifest decoded: id=\(manifest.id) rv=\(manifest.runtimeVersion) launchAsset.url=\(manifest.launchAsset.url) hash=\(manifest.launchAsset.hash)")
    if manifest.id == paths.activeUpdateId() && paths.activeRuntimeVersion() == runtimeVersion {
      Logger.ota.info("manifest id matches active bundle; skipping download")
      return ["status": "no-update"]
    }

    Logger.ota.info("downloading bundle: \(manifest.launchAsset.url)")
    let tmpDir = FileManager.default.temporaryDirectory
      .appendingPathComponent("ota-staging-\(UUID().uuidString)")
    try FileManager.default.createDirectory(at: tmpDir, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: tmpDir) }
    let tmpBundle = tmpDir.appendingPathComponent(paths.config.bundleFileName)
    try await Self.downloadAndVerify(
      urlString: manifest.launchAsset.url,
      expectedHashBase64Url: manifest.launchAsset.hash,
      destination: tmpBundle
    )
    Logger.ota.info("bundle downloaded: hash ok")

    try paths.setActive(updateId: manifest.id, runtimeVersion: runtimeVersion, bundleFile: tmpBundle)
    Logger.ota.info("active bundle swapped to id=\(manifest.id)")
    return ["status": "updated", "updateId": manifest.id]
  }

  private func err(_ message: String) -> NSError {
    NSError(domain: "LftUpdater", code: -1, userInfo: [NSLocalizedDescriptionKey: message])
  }

  private static func extractBoundary(_ contentType: String) -> String? {
    let parts = contentType.split(separator: ";").map { $0.trimmingCharacters(in: .whitespaces) }
    for p in parts where p.hasPrefix("boundary=") {
      var v = String(p.dropFirst("boundary=".count))
      if v.hasPrefix("\"") && v.hasSuffix("\"") { v = String(v.dropFirst().dropLast()) }
      return v
    }
    return nil
  }

  private static func parseMultipart(body: Data, boundary: String) throws -> [MultipartPart] {
    let bDelim = "--\(boundary)".data(using: .utf8)!
    var result: [MultipartPart] = []
    var cursor = 0
    while cursor < body.count {
      guard let bStart = body.range(of: bDelim, in: cursor..<body.count) else { break }
      let afterB = bStart.upperBound
      if afterB + 2 <= body.count {
        let twoChars = body.subdata(in: afterB..<min(afterB + 2, body.count))
        if twoChars == Data([0x2d, 0x2d]) { break }
      }
      let partStart = afterB + 2
      guard partStart <= body.count,
            let nextB = body.range(of: bDelim, in: partStart..<body.count) else { break }
      let partEnd = nextB.lowerBound - 2
      guard partEnd > partStart else { cursor = nextB.lowerBound; continue }
      let headerSep = body.range(of: Data([0x0d, 0x0a, 0x0d, 0x0a]), in: partStart..<partEnd)
      guard let headerSep = headerSep else { cursor = nextB.lowerBound; continue }
      let headerData = body.subdata(in: partStart..<headerSep.lowerBound)
      let partBody = body.subdata(in: headerSep.upperBound..<partEnd)
      let headers = parseHeaders(headerData)
      var name = ""
      if let cd = headers["content-disposition"], let r = cd.range(of: "name=\"") {
        let tail = cd[r.upperBound...]
        if let close = tail.firstIndex(of: "\"") {
          name = String(tail[..<close])
        }
      }
      result.append(MultipartPart(name: name, headers: headers, body: partBody))
      cursor = nextB.lowerBound
    }
    return result
  }

  private static func parseHeaders(_ data: Data) -> [String: String] {
    guard let s = String(data: data, encoding: .utf8) else { return [:] }
    var out: [String: String] = [:]
    for line in s.components(separatedBy: "\r\n") where !line.isEmpty {
      if let colon = line.firstIndex(of: ":") {
        let k = line[..<colon].trimmingCharacters(in: .whitespaces).lowercased()
        let v = line[line.index(after: colon)...].trimmingCharacters(in: .whitespaces)
        out[k] = String(v)
      }
    }
    return out
  }

  private static func parseSignatureHeader(_ header: String) throws -> String {
    for part in header.split(separator: ",") {
      let trimmed = part.trimmingCharacters(in: .whitespaces)
      if trimmed.hasPrefix("sig=") {
        var v = String(trimmed.dropFirst("sig=".count))
        if v.hasPrefix("\"") && v.hasSuffix("\"") { v = String(v.dropFirst().dropLast()) }
        return v
      }
    }
    throw NSError(domain: "LftUpdater", code: 10, userInfo: [NSLocalizedDescriptionKey: "missing sig in expo-signature"])
  }

  private static func verifyRSASHA256(body: Data, signatureBase64: String) throws {
    guard let signature = Data(base64Encoded: signatureBase64) else {
      throw NSError(domain: "LftUpdater", code: 11, userInfo: [NSLocalizedDescriptionKey: "bad sig base64"])
    }
    let stripped = lftUpdatesSigningCertificate
      .replacingOccurrences(of: "-----BEGIN CERTIFICATE-----", with: "")
      .replacingOccurrences(of: "-----END CERTIFICATE-----", with: "")
      .replacingOccurrences(of: "\n", with: "")
      .replacingOccurrences(of: "\r", with: "")
    guard let certDer = Data(base64Encoded: stripped, options: .ignoreUnknownCharacters),
          let cert = SecCertificateCreateWithData(nil, certDer as CFData),
          let publicKey = SecCertificateCopyKey(cert) else {
      throw NSError(domain: "LftUpdater", code: 12, userInfo: [NSLocalizedDescriptionKey: "bad signing cert"])
    }
    var error: Unmanaged<CFError>?
    let ok = SecKeyVerifySignature(
      publicKey,
      .rsaSignatureMessagePKCS1v15SHA256,
      body as CFData,
      signature as CFData,
      &error
    )
    if !ok {
      let msg = error?.takeRetainedValue().localizedDescription ?? "signature verify failed"
      throw NSError(domain: "LftUpdater", code: 13, userInfo: [NSLocalizedDescriptionKey: msg])
    }
  }

  /// Streams the bundle to `destination` and hashes it in fixed-size chunks. Buffering the whole
  /// bundle as `Data` — as this used to — is what pushed the watch app into jetsam during cold
  /// launch on Apple Watch SE.
  private static func downloadAndVerify(
    urlString: String,
    expectedHashBase64Url: String,
    destination: URL
  ) async throws {
    guard let url = URL(string: urlString) else {
      throw NSError(domain: "LftUpdater", code: 20, userInfo: [NSLocalizedDescriptionKey: "bad bundle URL"])
    }
    let (tempURL, response) = try await URLSession.shared.download(from: url)
    defer { try? FileManager.default.removeItem(at: tempURL) }
    guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
      throw NSError(domain: "LftUpdater", code: 21, userInfo: [NSLocalizedDescriptionKey: "bundle download failed"])
    }

    let hash = try sha256Base64Url(fileAt: tempURL)
    if hash != expectedHashBase64Url {
      throw NSError(domain: "LftUpdater", code: 22, userInfo: [NSLocalizedDescriptionKey: "bundle hash mismatch"])
    }

    try? FileManager.default.removeItem(at: destination)
    try FileManager.default.moveItem(at: tempURL, to: destination)
  }

  private static func sha256Base64Url(fileAt url: URL) throws -> String {
    let handle = try FileHandle(forReadingFrom: url)
    defer { try? handle.close() }
    var hasher = SHA256()
    while true {
      let chunk = try handle.read(upToCount: 64 * 1024) ?? Data()
      if chunk.isEmpty { break }
      hasher.update(data: chunk)
    }
    return Data(hasher.finalize()).base64URLEncodedString()
  }
}

private extension Data {
  func base64URLEncodedString() -> String {
    base64EncodedString()
      .replacingOccurrences(of: "+", with: "-")
      .replacingOccurrences(of: "/", with: "_")
      .replacingOccurrences(of: "=", with: "")
  }
}
