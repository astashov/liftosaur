//
//  AuthManager.swift
//  LiftosaurWatch Watch App
//

import Foundation
import Security
import OSLog

class AuthManager {
    static let shared = AuthManager()

    private let tokenKey = "liftosaur_auth_token"
    private let expiresKey = "liftosaur_auth_expires"
    private let userIdKey = "liftosaur_auth_userid"

    var token: String? {
        get { KeychainHelper.get(tokenKey) }
        set {
            if let value = newValue {
                KeychainHelper.set(tokenKey, value: value)
            } else {
                KeychainHelper.delete(tokenKey)
            }
        }
    }

    var userId: String? {
        get { UserDefaults.standard.string(forKey: userIdKey) }
        set {
            if let value = newValue {
                UserDefaults.standard.set(value, forKey: userIdKey)
            } else {
                UserDefaults.standard.removeObject(forKey: userIdKey)
            }
        }
    }

    var expiresAt: Date? {
        get {
            guard let timestamp = UserDefaults.standard.object(forKey: expiresKey) as? Double,
                  timestamp > 0 else {
                return nil
            }
            return Date(timeIntervalSince1970: timestamp)
        }
        set {
            if let date = newValue {
                UserDefaults.standard.set(date.timeIntervalSince1970, forKey: expiresKey)
            } else {
                UserDefaults.standard.removeObject(forKey: expiresKey)
            }
        }
    }

    var isAuthenticated: Bool {
        guard let token = token, !token.isEmpty else { return false }
        if let expires = expiresAt, expires < Date() {
            return false
        }
        return true
    }

    var needsRefresh: Bool {
        guard token != nil else { return true }
        guard let expires = expiresAt else { return true }
        // Refresh if expires within 1 hour
        return expires.timeIntervalSinceNow < 3600
    }

    func updateAuth(token: String, expiresAt: Double, userId: String? = nil) {
        self.token = token
        if expiresAt > 0 {
            self.expiresAt = Date(timeIntervalSince1970: expiresAt)
        }
        if let userId = userId {
            self.userId = userId
        }
        Logger.auth.info(" Updated auth token, expires: \(self.expiresAt?.description ?? "never"), userId: \(self.userId ?? "none")")
    }

    func clearAuth() {
        token = nil
        expiresAt = nil
        userId = nil
        Logger.auth.info(" Cleared auth")
    }
}

enum KeychainHelper {
    static func set(_ key: String, value: String) {
        guard let data = value.data(using: .utf8) else { return }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrService as String: "com.liftosaur.watch"
        ]

        // Delete existing item first
        SecItemDelete(query as CFDictionary)

        // Add new item
        var newQuery = query
        newQuery[kSecValueData as String] = data

        let status = SecItemAdd(newQuery as CFDictionary, nil)
        if status != errSecSuccess {
            Logger.auth.error("KeychainHelper: Failed to set \(key), status: \(status)")
        }
    }

    static func get(_ key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrService as String: "com.liftosaur.watch",
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let string = String(data: data, encoding: .utf8) else {
            return nil
        }

        return string
    }

    static func delete(_ key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrService as String: "com.liftosaur.watch"
        ]

        SecItemDelete(query as CFDictionary)
    }
}
