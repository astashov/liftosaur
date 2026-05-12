//
//  SharedMessageHandler.swift
//  Liftosaur
//

import Foundation
import OSLog

class SharedMessageHandler {
    static let shared = SharedMessageHandler()

    private let notifications = Notifications.shared

    func handleMessages(_ messages: [[String: String]]) {
        for message in messages {
            handleMessage(message)
        }
    }

    func handleMessage(_ message: [String: String]) {
        guard let type = message["type"] else { return }

        switch type {
        case "startTimer":
            handleStartTimer(message)
        case "stopTimer":
            handleStopTimer()
        case "stopReminder":
            handleStopReminder()
        default:
            Logger.engine.debug("Unhandled message type: \(type)")
        }
    }

    private func handleStartTimer(_ message: [String: String]) {
        guard let durationStr = message["duration"],
              let duration = Double(durationStr) else {
            Logger.engine.error("startTimer: invalid duration")
            return
        }

        let title = message["title"]
        let subtitleHeader = message["subtitleHeader"]
        let subtitle = message["subtitle"]
        let bodyHeader = message["bodyHeader"]
        let body = message["body"]
        let volume = Float(message["volume"] ?? "1.0") ?? 1.0

        Logger.engine.info("Scheduling timer notification in \(duration)s")

        notifications.requestNotificationAuthorization()
        notifications.cancelNotification()
        notifications.sendNotification(
            duration: duration,
            title: title,
            subtitleHeader: subtitleHeader,
            subtitle: subtitle,
            bodyHeader: bodyHeader,
            body: body,
            volume: volume
        )
    }

    private func handleStopTimer() {
        Logger.engine.info("Canceling timer notification")
        notifications.cancelNotification()
    }

    private func handleStopReminder() {
        Logger.engine.info("Canceling reminder notification")
        notifications.cancelReminder()
    }
}

