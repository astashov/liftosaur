import Foundation
import AVFoundation
import AudioToolbox
import UIKit
import UserNotifications

@objc class LiftosaurTimerImpl: NSObject {
  @objc static let shared = LiftosaurTimerImpl()

  private let center = UNUserNotificationCenter.current()
  private let timerIdentifier = "timerNotification"
  private let reminderIdentifier = "reminderNotification"
  private var audioPlayer: AVAudioPlayer?

  @objc func startTimer(duration: Double,
                        title: String,
                        subtitleHeader: String,
                        subtitle: String,
                        bodyHeader: String,
                        body: String,
                        volume: Double,
                        vibration: Bool,
                        ignoreDoNotDisturb: Bool,
                        completion: @escaping (Bool, String?) -> Void) {
    NSLog("[LftTimer] iOS startTimer duration=%.1f volume=%.2f vibration=%@", duration, volume, vibration ? "true" : "false")
    center.getNotificationSettings { settings in
      NSLog("[LftTimer] iOS authorizationStatus=%ld", settings.authorizationStatus.rawValue)
      switch settings.authorizationStatus {
      case .authorized, .provisional, .ephemeral:
        self.scheduleTimer(duration: duration, title: title, subtitleHeader: subtitleHeader, subtitle: subtitle,
                           bodyHeader: bodyHeader, body: body, volume: volume, completion: completion)
      case .notDetermined:
        NSLog("[LftTimer] iOS notDetermined — requesting authorization inline")
        self.center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
          NSLog("[LftTimer] iOS authorization request granted=%@ error=%@", granted ? "true" : "false", error?.localizedDescription ?? "nil")
          if granted {
            self.scheduleTimer(duration: duration, title: title, subtitleHeader: subtitleHeader, subtitle: subtitle,
                               bodyHeader: bodyHeader, body: body, volume: volume, completion: completion)
          } else {
            completion(false, "notifications")
          }
        }
      case .denied:
        NSLog("[LftTimer] iOS notifications permission denied")
        completion(false, "notifications")
      @unknown default:
        completion(false, "notifications")
      }
    }
  }

  private func scheduleTimer(duration: Double,
                             title: String,
                             subtitleHeader: String,
                             subtitle: String,
                             bodyHeader: String,
                             body: String,
                             volume: Double,
                             completion: @escaping (Bool, String?) -> Void) {
    let content = UNMutableNotificationContent()
    content.title = title.isEmpty ? "Timer" : title
    if !subtitle.isEmpty && !subtitleHeader.isEmpty {
      content.subtitle = "\(subtitleHeader): \(subtitle)"
    }
    content.body = (body.isEmpty || bodyHeader.isEmpty)
      ? "It's time for the next set!"
      : "\(bodyHeader): \(body)"
    if volume > 0 {
      // Must be a CAF/WAV/AIFF (Linear PCM) — UNNotificationSound silently falls back to the default
      // system sound for AAC formats like .m4r, so the custom cue never plays.
      content.sound = UNNotificationSound(named: UNNotificationSoundName("notification.caf"))
    }

    // UNTimeIntervalNotificationTrigger aborts the process on a non-positive interval, so an already-expired
    // timer has nothing to schedule.
    guard duration > 0 else {
      NSLog("[LftTimer] iOS schedule skipped, duration=%.1f already elapsed", duration)
      completion(true, nil)
      return
    }

    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: duration, repeats: false)
    let request = UNNotificationRequest(identifier: timerIdentifier, content: content, trigger: trigger)
    center.add(request) { error in
      if let error = error {
        NSLog("[LftTimer] iOS schedule failed: %@", error.localizedDescription)
        completion(false, "notifications")
      } else {
        NSLog("[LftTimer] iOS schedule ok, id=%@ fires in %.1fs", self.timerIdentifier, duration)
        completion(true, nil)
      }
    }
  }

  @objc func stopTimer() {
    center.removePendingNotificationRequests(withIdentifiers: [timerIdentifier])
  }

  @objc func scheduleReminder(duration: Double,
                              title: String,
                              body: String,
                              completion: @escaping (Bool, String?) -> Void) {
    NSLog("[LftTimer] iOS scheduleReminder duration=%.1f", duration)
    center.getNotificationSettings { settings in
      switch settings.authorizationStatus {
      case .authorized, .provisional, .ephemeral:
        self.scheduleReminderInternal(duration: duration, title: title, body: body, completion: completion)
      case .notDetermined:
        self.center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
          if granted {
            self.scheduleReminderInternal(duration: duration, title: title, body: body, completion: completion)
          } else {
            completion(false, "notifications")
          }
        }
      case .denied:
        completion(false, "notifications")
      @unknown default:
        completion(false, "notifications")
      }
    }
  }

  private func scheduleReminderInternal(duration: Double,
                                        title: String,
                                        body: String,
                                        completion: @escaping (Bool, String?) -> Void) {
    let content = UNMutableNotificationContent()
    content.title = title.isEmpty ? "Workout reminder" : title
    content.body = body.isEmpty ? "You have an ongoing workout, make sure to finish it if you're done" : body
    content.sound = UNNotificationSound(named: UNNotificationSoundName("notification.caf"))

    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: duration, repeats: false)
    let request = UNNotificationRequest(identifier: reminderIdentifier, content: content, trigger: trigger)
    center.add(request) { error in
      if let error = error {
        NSLog("[LftTimer] iOS reminder schedule failed: %@", error.localizedDescription)
        completion(false, "notifications")
      } else {
        NSLog("[LftTimer] iOS reminder scheduled, fires in %.1fs", duration)
        completion(true, nil)
      }
    }
  }

  @objc func cancelReminder() {
    NSLog("[LftTimer] iOS cancelReminder")
    center.removePendingNotificationRequests(withIdentifiers: [reminderIdentifier])
  }

  @objc func playSound(volume: Double, vibration: Bool, sound: String) {
    DispatchQueue.main.async {
      guard UIApplication.shared.applicationState == .active else { return }
      if vibration {
        AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
      }
      if volume <= 0 { return }
      let resource = sound.isEmpty ? "notification" : sound
      guard let url = Bundle.main.url(forResource: resource, withExtension: "m4r") else { return }
      do {
        // .playback (not .ambient) so the cue grabs the active output route and is audible over a
        // podcast playing on Bluetooth/AirPods; .duckOthers lowers it briefly, restored on deactivation.
        try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.duckOthers, .mixWithOthers])
        try AVAudioSession.sharedInstance().setActive(true, options: [])
        let player = try AVAudioPlayer(contentsOf: url)
        player.delegate = TimerAudioSessionDeactivator.shared
        player.volume = Float(min(max(volume, 0), 1))
        player.prepareToPlay()
        player.play()
        self.audioPlayer = player
      } catch {
        NSLog("LiftosaurTimerImpl: audio failed: \(error)")
      }
    }
  }

  @objc func getNotificationPermission(completion: @escaping (String) -> Void) {
    center.getNotificationSettings { settings in
      switch settings.authorizationStatus {
      case .authorized, .provisional, .ephemeral:
        completion("granted")
      case .denied:
        completion("denied")
      case .notDetermined:
        completion("denied")
      @unknown default:
        completion("denied")
      }
    }
  }

  @objc func requestNotificationPermission(completion: @escaping (String) -> Void) {
    let options: UNAuthorizationOptions = [.alert, .badge, .sound]
    center.requestAuthorization(options: options) { granted, _ in
      completion(granted ? "granted" : "denied")
    }
  }
}

// Kept fileprivate so AVAudioPlayerDelegate (an ObjC protocol) isn't leaked into Liftosaur-Swift.h
// via the @objc LiftosaurTimerImpl, which would break the ObjC++ Turbo Module wrappers.
fileprivate final class TimerAudioSessionDeactivator: NSObject, AVAudioPlayerDelegate {
  static let shared = TimerAudioSessionDeactivator()

  func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
    try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
  }
}
