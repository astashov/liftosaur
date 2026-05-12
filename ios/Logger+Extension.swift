import Foundation
import OSLog

extension Logger {
    private static let subsystem = Bundle.main.bundleIdentifier ?? "com.liftosaur.www"

    static let liveActivity = Logger(subsystem: subsystem, category: "liveactivity")
}
