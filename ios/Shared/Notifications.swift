import Foundation
import UserNotifications

class Notifications {
    static let shared = Notifications()

    let userNotificationCenter: UNUserNotificationCenter
    let timerIdentifier: String = "timerNotification"
    let reminderIdentifier = "reminderNotification"

    init() {
        userNotificationCenter = UNUserNotificationCenter.current()
    }
    
    func requestNotificationAuthorization() {
        let authOptions = UNAuthorizationOptions.init(arrayLiteral: .alert, .badge, .sound)
        self.userNotificationCenter.requestAuthorization(options: authOptions) {
            (success, error) in
                if let error = error {
                    print("Error: ", error)
                }
        }
    }
    
    func sendNotification(duration: TimeInterval,
                          title: String?,
                          subtitleHeader: String?,
                          subtitle: String?,
                          bodyHeader: String?,
                          body: String?,
                          volume: Float = 1.0
    ) {
        let notificationContent = UNMutableNotificationContent()
        notificationContent.title = (title ?? "").isEmpty ? "Timer" : title!
        if let subtitle = subtitle, let subtitleHeader = subtitleHeader {
            if (!subtitle.isEmpty && !subtitleHeader.isEmpty) {
                notificationContent.subtitle = "\(subtitleHeader): \(subtitle)"
            }
        }
        notificationContent.body = (body ?? "").isEmpty || (bodyHeader ?? "").isEmpty ?
          "It's time for the next set!" :
          "\(bodyHeader ?? ""): \(body ?? "")"
        if volume > 0 {
            #if os(watchOS)
            notificationContent.sound = UNNotificationSound.default
            #else
            notificationContent.sound = UNNotificationSound(named: UNNotificationSoundName("notification.m4r"))
            #endif
        }

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: duration,
                                                        repeats: false)
        let request = UNNotificationRequest(identifier: timerIdentifier,
                                            content: notificationContent,
                                            trigger: trigger)
        
        userNotificationCenter.add(request) { (error) in
            if let error = error {
                print("Notification Error: ", error)
            }
        }
    }
    
    func cancelNotification() {
        userNotificationCenter.removePendingNotificationRequests(withIdentifiers: [timerIdentifier])
    }
    
    func sendReminder(duration: TimeInterval) {
        let notificationContent = UNMutableNotificationContent()
        notificationContent.title = "Workout reminder"
        notificationContent.body = "You have an ongoing workout, make sure to finish it if you're done"
        #if os(watchOS)
        notificationContent.sound = UNNotificationSound.default
#else
        notificationContent.sound = UNNotificationSound(named: UNNotificationSoundName("notification.m4r"))
#endif

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: duration, repeats: false)
        let request = UNNotificationRequest(identifier: reminderIdentifier,
                                            content: notificationContent,
                                            trigger: trigger)
        
        userNotificationCenter.add(request) { (error) in
            if let error = error {
                print("Notification Error: ", error)
            }
        }
    }
    
    func cancelReminder() {
        userNotificationCenter.removePendingNotificationRequests(withIdentifiers: [reminderIdentifier])
    }
}
