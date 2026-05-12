//
//  WatchMessageHandler.swift
//  LiftosaurWatch Watch App
//

import Foundation
import OSLog

class WatchMessageHandler {
    static let shared = WatchMessageHandler()

    private let sharedHandler = SharedMessageHandler.shared

    func handleMessages(_ messages: [[String: String]]) {
        for message in messages {
            handleMessage(message)
        }
    }

    private func handleMessage(_ message: [String: String]) {
        guard let type = message["type"] else { return }

        switch type {
        case "updateLiveActivity":
            handleUpdateLiveActivity(message)
        case "event":
            handleEvent(message)
        default:
            // Delegate to shared handler for common messages (startTimer, stopTimer, etc.)
            sharedHandler.handleMessage(message)
        }
    }

    private func handleEvent(_ message: [String: String]) {
        guard let data = message["data"] else { return }
        let userId = message["userId"]
        let commitHash = message["commithash"]
        WatchEventManager.shared.logEvent(data: data, userId: userId, commitHash: commitHash)
    }

    private func handleUpdateLiveActivity(_ message: [String: String]) {
        Logger.engine.info("Forwarding updateLiveActivity to phone")
        WatchConnectivityManager.shared.sendLiveActivityUpdate(message)
    }
}

