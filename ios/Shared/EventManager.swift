import Foundation
import OSLog

struct Event: Codable, Equatable {
    let id: String
    let data: String
    let timestamp: Date

    init(data: String) {
        self.id = UUID().uuidString
        self.data = data
        self.timestamp = Date()
    }
}

protocol EventManagerDelegate: AnyObject {
    func eventManagerDidFinishProcessing()
}

class EventManager {
    private weak var delegate: EventManagerDelegate?

    private let queue = DispatchQueue(label: "com.liftosaur.eventmanager", qos: .background)
    private var pendingEvents: [Event] = []
    private var processingEvents: [Event] = []
    private var timer: Timer?
    private let batchSize = 50
    private let flushInterval: TimeInterval = 30.0
    private let retryDelay: TimeInterval = 5.0

    private let pendingEventsKey: String
    private let failedEventsKey: String
    private let processingEventsKey: String
    private let cachedUserIdKey: String
    private let cachedCommitHashKey: String

    private let apiUrl: URL

    private var cachedUserId: String?
    private var cachedCommitHash: String?

    private var pendingNativeEvents: [(name: String, timestamp: Date?, extra: [String: String]?)] = []

    private var isProcessing = false

    init(keyPrefix: String, apiUrl: URL, delegate: EventManagerDelegate? = nil) {
        self.pendingEventsKey = "\(keyPrefix)PendingEvents"
        self.failedEventsKey = "\(keyPrefix)FailedEvents"
        self.processingEventsKey = "\(keyPrefix)ProcessingEvents"
        self.cachedUserIdKey = "\(keyPrefix)CachedUserId"
        self.cachedCommitHashKey = "\(keyPrefix)CachedCommitHash"
        self.apiUrl = apiUrl
        self.delegate = delegate

        cachedUserId = UserDefaults.standard.string(forKey: cachedUserIdKey)
        cachedCommitHash = UserDefaults.standard.string(forKey: cachedCommitHashKey)

        recoverFromCrash()
        loadPendingEvents()
        processFailedEvents()
    }

    deinit {
        DispatchQueue.main.async { [weak timer] in
            timer?.invalidate()
        }
    }

    // MARK: - Public API

    public func setDelegate(_ delegate: EventManagerDelegate) {
        self.delegate = delegate
    }

    public func setCredentials(userId: String, commitHash: String) {
        queue.async { [weak self] in
            guard let self = self else { return }
            self.cachedUserId = userId
            self.cachedCommitHash = commitHash
            UserDefaults.standard.set(userId, forKey: self.cachedUserIdKey)
            UserDefaults.standard.set(commitHash, forKey: self.cachedCommitHashKey)

            if !self.pendingNativeEvents.isEmpty {
                let eventsToFlush = self.pendingNativeEvents
                self.pendingNativeEvents = []
                for (name, timestamp, extra) in eventsToFlush {
                    self.logNativeEvent(name: name, timestamp: timestamp, extra: extra)
                }
            }
        }
    }

    public func logEvent(data: String, userId: String? = nil, commitHash: String? = nil) {
        guard !data.isEmpty, data.count < 1_000_000 else {
            Logger.events.warning("EventManager: Invalid event data (empty or too large)")
            return
        }

        queue.async { [weak self] in
            guard let self = self else { return }

            if let userId = userId {
                self.cachedUserId = userId
                UserDefaults.standard.set(userId, forKey: self.cachedUserIdKey)
            }
            if let commitHash = commitHash {
                self.cachedCommitHash = commitHash
                UserDefaults.standard.set(commitHash, forKey: self.cachedCommitHashKey)
            }

            let event = Event(data: data)
            self.pendingEvents.append(event)

            self.persistEvents()

            if self.pendingEvents.count >= self.batchSize {
                self.flushEvents()
            }

            if !self.pendingNativeEvents.isEmpty,
               self.cachedUserId != nil, self.cachedCommitHash != nil {
                let eventsToFlush = self.pendingNativeEvents
                self.pendingNativeEvents = []

                for (name, timestamp, extra) in eventsToFlush {
                    self.logNativeEvent(name: name, timestamp: timestamp, extra: extra)
                }
            }
        }
    }

    public func logNativeEvent(name: String, timestamp: Date? = nil, extra: [String: String]? = nil) {
        guard let userId = cachedUserId, let commitHash = cachedCommitHash else {
            queue.async { [weak self] in
                self?.pendingNativeEvents.append((name: name, timestamp: timestamp, extra: extra))
                Logger.events.debug("EventManager: Queued native event '\(name)' - waiting for userId/commitHash")
            }
            return
        }

        var eventDict: [String: Any] = [
            "type": "event",
            "name": name,
            "userId": userId,
            "commithash": commitHash,
            "timestamp": Int64((timestamp ?? Date()).timeIntervalSince1970 * 1000),
            "isMobile": true
        ]

        if let extra = extra {
            eventDict["extra"] = extra
        }

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: eventDict)
            if let jsonString = String(data: jsonData, encoding: .utf8) {
                logEvent(data: jsonString)
            }
        } catch {
            Logger.events.error("EventManager: Failed to create native event: \(error)")
        }
    }

    // MARK: - Timer Management

    public func startTimer() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            self.timer?.invalidate()
            self.timer = Timer.scheduledTimer(withTimeInterval: self.flushInterval, repeats: true) { [weak self] _ in
                autoreleasepool {
                    self?.flushEvents()
                }
            }
        }
    }

    public func stopTimer() {
        DispatchQueue.main.async { [weak self] in
            self?.timer?.invalidate()
            self?.timer = nil
        }
    }

    // MARK: - Lifecycle Hooks (called by platform wrappers)

    public func handleWillResignActive() {
        stopTimer()
        flushEvents(force: true)
    }

    public func handleDidBecomeActive() {
        recoverFromCrash()
        loadPendingEvents()
        processFailedEvents()
        startTimer()
    }

    // MARK: - Flush

    public func flushEvents(force: Bool = false) {
        queue.async { [weak self] in
            guard let self = self else { return }

            if self.isProcessing {
                if force {
                    self.persistEvents()
                }
                return
            }

            if self.pendingEvents.isEmpty {
                self.delegate?.eventManagerDidFinishProcessing()
                return
            }

            self.isProcessing = true

            let eventsToSend = self.pendingEvents
            self.processingEvents.append(contentsOf: eventsToSend)
            self.pendingEvents = []
            self.persistProcessingEvents()
            UserDefaults.standard.removeObject(forKey: self.pendingEventsKey)

            self.sendEvents(eventsToSend) { [weak self] success, acknowledgedIds in
                self?.queue.async {
                    guard let self = self else { return }

                    self.isProcessing = false

                    if success, let acknowledgedIds = acknowledgedIds {
                        self.processingEvents.removeAll { event in
                            acknowledgedIds.contains(event.id)
                        }

                        let unacknowledgedEvents = eventsToSend.filter { event in
                            !acknowledgedIds.contains(event.id)
                        }
                        if !unacknowledgedEvents.isEmpty {
                            self.handleFailedEvents(unacknowledgedEvents)
                        }
                    } else {
                        self.handleFailedEvents(eventsToSend)
                    }

                    self.processingEvents.removeAll { event in
                        eventsToSend.contains(event)
                    }
                    self.persistProcessingEvents()

                    self.delegate?.eventManagerDidFinishProcessing()
                }
            }
        }
    }

    // MARK: - Network

    private func sendEvents(_ events: [Event], completion: @escaping (Bool, [String]?) -> Void) {
        let url = apiUrl.appendingPathComponent("api/batchevents")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload = events.map { event in
            return [
                "id": event.id,
                "data": event.data
            ]
        }

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: ["events": payload])
        } catch {
            Logger.events.error("EventManager: Failed to serialize events: \(error)")
            completion(false, nil)
            return
        }

        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 5.0
        config.urlCache = nil

        let session = URLSession(configuration: config)

        let task = session.dataTask(with: request) { data, response, error in
            defer {
                session.finishTasksAndInvalidate()
            }

            if let httpResponse = response as? HTTPURLResponse,
               httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 {

                do {
                    if let data = data {
                        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                        let acknowledgedIds = json?["acknowledged"] as? [String]
                        completion(true, acknowledgedIds ?? events.map { $0.id })
                    } else {
                        completion(true, events.map { $0.id })
                    }
                } catch {
                    Logger.events.error("EventManager: Failed to parse response: \(error)")
                    completion(true, events.map { $0.id })
                }
            } else {
                completion(false, nil)
            }
        }

        task.resume()
    }

    // MARK: - Failed Events

    private func handleFailedEvents(_ events: [Event]) {
        queue.async { [weak self] in
            guard let self = self else { return }

            var failedEvents = self.loadFailedEvents()
            for event in events {
                if !failedEvents.contains(where: { $0.id == event.id }) {
                    failedEvents.append(event)
                }
            }

            if failedEvents.count > 1000 {
                failedEvents = Array(failedEvents.suffix(1000))
            }

            self.saveFailedEvents(failedEvents)
        }
    }

    private func processFailedEvents() {
        queue.asyncAfter(deadline: .now() + retryDelay) { [weak self] in
            guard let self = self else { return }

            let failedEvents = self.loadFailedEvents()
            if !failedEvents.isEmpty {
                self.processingEvents.append(contentsOf: failedEvents)
                self.persistProcessingEvents()

                self.sendEvents(failedEvents) { [weak self] success, acknowledgedIds in
                    self?.queue.async {
                        guard let self = self else { return }

                        if success, let acknowledgedIds = acknowledgedIds {
                            self.processingEvents.removeAll { event in
                                acknowledgedIds.contains(event.id)
                            }

                            let acknowledgedFailedEvents = failedEvents.filter { event in
                                acknowledgedIds.contains(event.id)
                            }
                            if !acknowledgedFailedEvents.isEmpty {
                                var currentFailedEvents = self.loadFailedEvents()
                                currentFailedEvents.removeAll { event in
                                    acknowledgedIds.contains(event.id)
                                }
                                if currentFailedEvents.isEmpty {
                                    self.clearFailedEvents()
                                } else {
                                    self.saveFailedEvents(currentFailedEvents)
                                }
                            }

                            let unacknowledgedEvents = failedEvents.filter { event in
                                !acknowledgedIds.contains(event.id)
                            }
                            if !unacknowledgedEvents.isEmpty {
                                self.handleFailedEvents(unacknowledgedEvents)
                            }
                        } else {
                            self.handleFailedEvents(failedEvents)
                        }

                        self.processingEvents.removeAll { event in
                            failedEvents.contains(event)
                        }
                        self.persistProcessingEvents()
                    }
                }
            }
        }
    }

    // MARK: - Persistence

    private func persistEvents() {
        var allEvents: [Event] = []

        if let data = UserDefaults.standard.data(forKey: pendingEventsKey),
           let persistedEvents = try? JSONDecoder().decode([Event].self, from: data) {
            allEvents = persistedEvents
        }

        for event in pendingEvents {
            if !allEvents.contains(where: { $0.id == event.id }) {
                allEvents.append(event)
            }
        }

        if allEvents.isEmpty {
            UserDefaults.standard.removeObject(forKey: pendingEventsKey)
            return
        }

        do {
            let data = try JSONEncoder().encode(allEvents)
            UserDefaults.standard.set(data, forKey: pendingEventsKey)
        } catch {
            Logger.events.error("EventManager: Failed to persist events: \(error)")
        }
    }

    private func loadPendingEvents() {
        queue.async { [weak self] in
            guard let self = self else { return }

            if let data = UserDefaults.standard.data(forKey: self.pendingEventsKey),
               let events = try? JSONDecoder().decode([Event].self, from: data) {
                for event in events {
                    if !self.pendingEvents.contains(where: { $0.id == event.id }) {
                        self.pendingEvents.append(event)
                    }
                }
            }
        }
    }

    private func saveFailedEvents(_ events: [Event]) {
        do {
            let data = try JSONEncoder().encode(events)
            UserDefaults.standard.set(data, forKey: failedEventsKey)
        } catch {
            Logger.events.error("Failed to save failed events: \(error)")
        }
    }

    private func loadFailedEvents() -> [Event] {
        guard let data = UserDefaults.standard.data(forKey: failedEventsKey),
              let events = try? JSONDecoder().decode([Event].self, from: data) else {
            return []
        }
        return events
    }

    private func clearFailedEvents() {
        UserDefaults.standard.removeObject(forKey: failedEventsKey)
    }

    private func persistProcessingEvents() {
        if processingEvents.isEmpty {
            UserDefaults.standard.removeObject(forKey: processingEventsKey)
            return
        }

        do {
            let data = try JSONEncoder().encode(processingEvents)
            UserDefaults.standard.set(data, forKey: processingEventsKey)
        } catch {
            Logger.events.error("Failed to persist processing events: \(error)")
        }
    }

    private func recoverFromCrash() {
        queue.sync {
            if let data = UserDefaults.standard.data(forKey: processingEventsKey),
               let events = try? JSONDecoder().decode([Event].self, from: data) {
                var failedEvents = loadFailedEvents()
                for event in events {
                    if !failedEvents.contains(where: { $0.id == event.id }) {
                        failedEvents.append(event)
                    }
                }
                saveFailedEvents(failedEvents)
                UserDefaults.standard.removeObject(forKey: processingEventsKey)
            }
        }
    }
}

extension Logger {
    static let events = Logger(subsystem: Bundle.main.bundleIdentifier ?? "com.liftosaur", category: "events")
}
