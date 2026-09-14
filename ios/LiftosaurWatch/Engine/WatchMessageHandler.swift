//
//  WatchMessageHandler.swift
//  LiftosaurWatch Watch App
//

import Foundation
import OSLog

class WatchMessageHandler {
    static let shared = WatchMessageHandler()

    private let sharedHandler = SharedMessageHandler.shared

    // The engine calls this from its serial JS queue; main.async keeps that order, one Task per
    // batch would not.
    func handleMessages(_ messages: [[String: String]]) {
        DispatchQueue.main.async {
            MainActor.assumeIsolated {
                for message in messages {
                    self.handleMessage(message)
                }
            }
        }
    }

    @MainActor
    private func handleMessage(_ message: [String: String]) {
        guard let type = message["type"] else { return }

        switch type {
        case "updateLiveActivity":
            handleUpdateLiveActivity(message)
        case "event":
            handleEvent(message)
        case "startTimer":
            WorkoutManager.shared.restNotification.start(message)
        case "stopTimer":
            WorkoutManager.shared.restNotification.stop()
        default:
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
