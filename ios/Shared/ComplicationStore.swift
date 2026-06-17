import Foundation

struct ComplicationInfo: Codable, Equatable {
    let isOngoing: Bool
    let programName: String
    let dayName: String
}

// Bridges the watch app and the complication extension, which run in separate
// processes and can only share data through the App Group container.
enum ComplicationStore {
    static let appGroupId = "group.com.liftosaur.workout"
    private static let key = "complicationInfo"

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroupId)
    }

    static func load() -> ComplicationInfo? {
        guard let data = defaults?.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(ComplicationInfo.self, from: data)
    }

    static func save(_ info: ComplicationInfo?) {
        guard let defaults = defaults else { return }
        if let info = info, let data = try? JSONEncoder().encode(info) {
            defaults.set(data, forKey: key)
        } else {
            defaults.removeObject(forKey: key)
        }
    }
}
