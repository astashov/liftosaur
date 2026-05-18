import Foundation
import CryptoKit
import OSLog

@objc class LftUpdater: NSObject {
  @objc static let shared = LftUpdater()

  private static let fallbackManifestURL = "https://www.liftosaur.com/api/updates/manifest"
  private static let channel = "production"

  private static var manifestURL: String {
    (Bundle.main.infoDictionary?["LftUpdatesManifestURL"] as? String) ?? fallbackManifestURL
  }

  @objc func checkAndDownload(completion: @escaping (String) -> Void) {
    Logger.ota.info("checkAndDownload called (active=\(LftUpdaterPath.activeUpdateId() ?? "<none>"))")
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
  }

  @objc func markLaunchSuccessful() {
    let d = UserDefaults.standard
    let hadCount = d.integer(forKey: "LftUpdater.crashCount")
    d.set(false, forKey: "LftUpdater.launchInProgress")
    d.set(0, forKey: "LftUpdater.crashCount")
    Logger.ota.info("markLaunchSuccessful (crashCount was \(hadCount))")
  }

  @objc func activeBundleId() -> String? {
    return LftUpdaterPath.activeUpdateId()
  }

  @objc func revertToEmbedded() {
    Logger.ota.warning("revertToEmbedded called (was active=\(LftUpdaterPath.activeUpdateId() ?? "<none>"))")
    LftUpdaterPath.revertToEmbedded()
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
    let runtimeVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0"
    Logger.ota.info("fetching manifest: url=\(Self.manifestURL) platform=ios rv=\(runtimeVersion) channel=\(Self.channel)")
    var req = URLRequest(url: URL(string: Self.manifestURL)!)
    req.httpMethod = "GET"
    req.setValue("1", forHTTPHeaderField: "expo-protocol-version")
    req.setValue("ios", forHTTPHeaderField: "expo-platform")
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
        LftUpdaterPath.revertToEmbedded()
      }
      return ["status": "no-update"]
    }

    let manifest = try JSONDecoder().decode(Manifest.self, from: first.body)
    Logger.ota.info("manifest decoded: id=\(manifest.id) rv=\(manifest.runtimeVersion) launchAsset.url=\(manifest.launchAsset.url) hash=\(manifest.launchAsset.hash)")
    if manifest.id == LftUpdaterPath.activeUpdateId() {
      Logger.ota.info("manifest id matches active bundle; skipping download")
      return ["status": "no-update"]
    }

    Logger.ota.info("downloading bundle: \(manifest.launchAsset.url)")
    let bundleData = try await Self.downloadAndVerify(
      urlString: manifest.launchAsset.url,
      expectedHashBase64Url: manifest.launchAsset.hash
    )
    Logger.ota.info("bundle downloaded: bytes=\(bundleData.count) hash ok")
    let tmpDir = FileManager.default.temporaryDirectory
      .appendingPathComponent("ota-staging-\(UUID().uuidString)")
    try FileManager.default.createDirectory(at: tmpDir, withIntermediateDirectories: true)
    let tmpBundle = tmpDir.appendingPathComponent("main.jsbundle")
    try bundleData.write(to: tmpBundle, options: .atomic)

    try LftUpdaterPath.setActive(updateId: manifest.id, bundleFile: tmpBundle)
    try? FileManager.default.removeItem(at: tmpDir)
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
    let pem = Bundle.main.infoDictionary?["LftUpdatesSigningCertificate"] as? String ?? ""
    let stripped = pem
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

  private static func downloadAndVerify(urlString: String, expectedHashBase64Url: String) async throws -> Data {
    guard let url = URL(string: urlString) else {
      throw NSError(domain: "LftUpdater", code: 20, userInfo: [NSLocalizedDescriptionKey: "bad bundle URL"])
    }
    let (data, response) = try await URLSession.shared.data(from: url)
    guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
      throw NSError(domain: "LftUpdater", code: 21, userInfo: [NSLocalizedDescriptionKey: "bundle download failed"])
    }
    let hash = Data(SHA256.hash(data: data)).base64URLEncodedString()
    if hash != expectedHashBase64Url {
      throw NSError(domain: "LftUpdater", code: 22, userInfo: [NSLocalizedDescriptionKey: "bundle hash mismatch"])
    }
    return data
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
