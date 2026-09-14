import Combine
import Foundation
import OSLog

// The watch's own rest notification exists for a watch that cannot chirp itself: no workout session
// (Health permission denied, or the session failed), so the app is suspended at the deadline.
@MainActor
final class RestNotification {
    private let sharedHandler = SharedMessageHandler.shared
    private var pending: (message: [String: String], deadline: Date)?
    private var sessionObserver: AnyCancellable?

    init() {
        sessionObserver = HealthKitManager.shared.$isSessionActive
            .removeDuplicates()
            .sink { [weak self] _ in
                Task { @MainActor in self?.reconcile() }
            }
    }

    func start(_ message: [String: String]) {
        guard let duration = Double(message["duration"] ?? "") else {
            Logger.engine.error("startTimer: invalid duration")
            return
        }
        pending = (message, Date().addingTimeInterval(duration))
        reconcile()
    }

    func stop() {
        pending = nil
        Notifications.shared.cancelNotification()
    }

    private func reconcile() {
        if HealthKitManager.shared.isSessionActive {
            Notifications.shared.cancelNotification()
            return
        }
        guard let pending = pending else { return }
        let remaining = pending.deadline.timeIntervalSinceNow
        guard remaining > 0 else {
            self.pending = nil
            return
        }
        var replay = pending.message
        replay["duration"] = String(remaining)
        sharedHandler.handleMessage(replay)
    }
}
