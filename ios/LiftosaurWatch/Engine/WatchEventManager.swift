import Foundation
import WatchKit
import OSLog

class WatchEventManager: EventManagerDelegate {
    static let shared = WatchEventManager()

    private let eventManager: EventManager

    private init() {
        eventManager = EventManager(
            keyPrefix: "LiftosaurWatch",
            apiUrl: baseApiUrl
        )
        eventManager.setDelegate(self)
        eventManager.startTimer()
        setupNotifications()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - Public API

    public func logEvent(data: String, userId: String? = nil, commitHash: String? = nil) {
        eventManager.logEvent(data: data, userId: userId, commitHash: commitHash)
    }

    public func logNativeEvent(name: String, timestamp: Date? = nil, extra: [String: String]? = nil) {
        eventManager.logNativeEvent(name: name, timestamp: timestamp, extra: extra)
    }

    public func setCredentials(userId: String, commitHash: String) {
        eventManager.setCredentials(userId: userId, commitHash: commitHash)
    }

    // MARK: - EventManagerDelegate

    func eventManagerDidFinishProcessing() {
        // No background task on watchOS
    }

    // MARK: - Notifications

    private func setupNotifications() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appWillResignActive),
            name: WKApplication.willResignActiveNotification,
            object: nil
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidBecomeActive),
            name: WKApplication.didBecomeActiveNotification,
            object: nil
        )
    }

    @objc private func appWillResignActive() {
        eventManager.handleWillResignActive()
    }

    @objc private func appDidBecomeActive() {
        eventManager.handleDidBecomeActive()
    }
}
