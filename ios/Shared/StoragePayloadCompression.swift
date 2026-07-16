//
//  StoragePayloadCompression.swift
//  Shared between the iOS app and the watch app for WCSession storage sync.
//

import Foundation
import OSLog

/// WCSession payloads (sendMessage / applicationContext / userInfo) cap at ~65KB, and full storage
/// (settings.exerciseData + _versions) can far exceed that. Compress only oversized payloads: small
/// ones stay as plain "storage" so builds without "storageZ" support keep working — for them,
/// oversized payloads were already failing at send, so nothing regresses.
enum StoragePayloadCompression {
    static let compressionThreshold = 60_000

    static func compressIfLarge(_ json: String) -> Data? {
        let data = Data(json.utf8)
        guard data.count > compressionThreshold else { return nil }
        return try? (data as NSData).compressed(using: .zlib) as Data
    }

    static func decompress(_ data: Data) -> String? {
        guard let decompressed = try? (data as NSData).decompressed(using: .zlib) else { return nil }
        return String(data: decompressed as Data, encoding: .utf8)
    }

    /// Reads storage JSON from an incoming WCSession payload, whichever encoding it used.
    static func extractStorageJson(_ data: [String: Any]) -> String? {
        if let compressed = data["storageZ"] as? Data {
            let json = decompress(compressed)
            if json == nil {
                Logger.wc.error(" failed to decompress incoming storage (\(compressed.count) bytes)")
            }
            return json
        }
        return data["storage"] as? String
    }

    /// Per-top-level-key serialized sizes (largest first), for diagnosing what outgrew the payload cap.
    static func sizeBreakdown(_ json: String) -> String {
        guard let data = json.data(using: .utf8),
              let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return ""
        }
        let sizes: [(String, Int)] = dict.compactMap { key, value in
            let size = (try? JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed]))?.count
            return size.map { (key, $0) }
        }
        return sizes
            .sorted { $0.1 > $1.1 }
            .map { "\($0.0)=\($0.1)" }
            .joined(separator: ", ")
    }
}
