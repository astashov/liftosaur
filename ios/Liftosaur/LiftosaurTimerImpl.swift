import Foundation
import AVFoundation
import AudioToolbox
import OSLog
import UIKit
import UserNotifications

@objc class LiftosaurTimerImpl: NSObject {
  @objc static let shared = LiftosaurTimerImpl()

  private struct PendingRest {
    let id: String
    let deadline: Date
    let vibration: Bool
    var volume: Double
    var content: UNMutableNotificationContent?
    var floorApplied = false
  }

  private let center = UNUserNotificationCenter.current()
  private let timerIdentifier = "timerNotification"
  private let reminderIdentifier = "reminderNotification"
  // The notification sits after the in-process deadline so cancelling it after the cue lands in time.
  private let notificationFloorDelay: TimeInterval = 1
  private var audioPlayer: AVAudioPlayer?
  fileprivate var keepAlivePlayer: AVAudioPlayer?
  private var deadlineTimer: DispatchSourceTimer?
  private var generation = 0
  private var pendingRest: PendingRest?

  override init() {
    super.init()
    let notifications = NotificationCenter.default
    notifications.addObserver(self, selector: #selector(appDidEnterBackground), name: UIApplication.didEnterBackgroundNotification, object: nil)
    notifications.addObserver(self, selector: #selector(appDidBecomeActive), name: UIApplication.didBecomeActiveNotification, object: nil)
    notifications.addObserver(self, selector: #selector(audioRouteChanged), name: AVAudioSession.routeChangeNotification, object: nil)
    notifications.addObserver(self, selector: #selector(audioInterrupted(_:)), name: AVAudioSession.interruptionNotification, object: nil)
    notifications.addObserver(self, selector: #selector(mediaServicesReset), name: AVAudioSession.mediaServicesWereResetNotification, object: nil)
  }

  @objc func startTimer(duration: Double,
                        title: String,
                        subtitleHeader: String,
                        subtitle: String,
                        bodyHeader: String,
                        body: String,
                        volume: Double,
                        vibration: Bool,
                        ignoreDoNotDisturb: Bool,
                        timerSinceMs: Double,
                        timerSeconds: Double,
                        completion: @escaping (Bool, String?) -> Void) {
    Logger.notifications.info("startTimer duration=\(duration) volume=\(volume) vibration=\(vibration)")
    let rest = PendingRest(
      id: "\(Int64(timerSinceMs))-\(Int64(timerSeconds))",
      deadline: Date(timeIntervalSince1970: timerSinceMs / 1000 + timerSeconds),
      vibration: vibration,
      volume: volume
    )
    DispatchQueue.main.async {
      if self.pendingRest?.id == rest.id {
        self.pendingRest?.volume = volume
        Logger.notifications.info("startTimer: rest \(rest.id) already pending")
        completion(true, nil)
        return
      }
      self.generation += 1
      self.pendingRest = rest
      self.stopKeepAlive()
      self.armDeadline(rest, generation: self.generation)
      self.startKeepAliveIfNeeded()
      self.removeTimerRequests()
      self.scheduleNotification(rest, generation: self.generation, title: title, subtitleHeader: subtitleHeader,
                                subtitle: subtitle, bodyHeader: bodyHeader, body: body, completion: completion)
    }
  }

  private func notificationId(_ restId: String) -> String {
    "\(timerIdentifier)-\(restId)"
  }

  // Ids do not survive a relaunch and builds before this one used the bare identifier, so cleanup
  // enumerates the center and keeps only the rest that is pending when the list comes back.
  private func removeTimerRequests() {
    center.getPendingNotificationRequests { requests in
      DispatchQueue.main.async {
        let keep = self.pendingRest.map { self.notificationId($0.id) }
        let stale = requests.map { $0.identifier }.filter { id in
          (id == self.timerIdentifier || id.hasPrefix(self.timerIdentifier + "-")) && id != keep
        }
        if !stale.isEmpty {
          self.center.removePendingNotificationRequests(withIdentifiers: stale)
        }
      }
    }
  }

  private func scheduleNotification(_ rest: PendingRest,
                                    generation gen: Int,
                                    title: String,
                                    subtitleHeader: String,
                                    subtitle: String,
                                    bodyHeader: String,
                                    body: String,
                                    completion: @escaping (Bool, String?) -> Void) {
    center.getNotificationSettings { settings in
      Logger.notifications.info("authorizationStatus=\(settings.authorizationStatus.rawValue)")
      switch settings.authorizationStatus {
      case .authorized, .provisional, .ephemeral:
        self.scheduleTimer(rest, generation: gen, title: title, subtitleHeader: subtitleHeader, subtitle: subtitle,
                           bodyHeader: bodyHeader, body: body, completion: completion)
      case .notDetermined:
        Logger.notifications.info("notDetermined, requesting authorization inline")
        self.center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
          Logger.notifications.info("authorization request granted=\(granted) error=\(error?.localizedDescription ?? "nil")")
          if granted {
            self.scheduleTimer(rest, generation: gen, title: title, subtitleHeader: subtitleHeader, subtitle: subtitle,
                               bodyHeader: bodyHeader, body: body, completion: completion)
          } else {
            completion(false, "notifications")
          }
        }
      case .denied:
        Logger.notifications.error("notifications permission denied")
        completion(false, "notifications")
      @unknown default:
        completion(false, "notifications")
      }
    }
  }

  private func scheduleTimer(_ rest: PendingRest,
                             generation gen: Int,
                             title: String,
                             subtitleHeader: String,
                             subtitle: String,
                             bodyHeader: String,
                             body: String,
                             completion: @escaping (Bool, String?) -> Void) {
    DispatchQueue.main.async {
      guard gen == self.generation else {
        Logger.notifications.info("schedule skipped, rest \(rest.id) was replaced during the permission lookup")
        completion(true, nil)
        return
      }
      let content = UNMutableNotificationContent()
      content.title = title.isEmpty ? "Timer" : title
      if !subtitle.isEmpty && !subtitleHeader.isEmpty {
        content.subtitle = "\(subtitleHeader): \(subtitle)"
      }
      content.body = (body.isEmpty || bodyHeader.isEmpty)
        ? "It's time for the next set!"
        : "\(bodyHeader): \(body)"
      if rest.volume > 0 {
        // Must be a CAF/WAV/AIFF (Linear PCM) — UNNotificationSound silently falls back to the default
        // system sound for AAC formats like .m4r, so the custom cue never plays.
        content.sound = UNNotificationSound(named: UNNotificationSoundName("notification.caf"))
      }
      self.pendingRest?.content = content
      self.installNotification(generation: gen, completion: completion)
    }
  }

  // The floor sits after the deadline only when this phone may play the cue itself, so a phone with no
  // watch keeps its notification exactly at the deadline. Re-adding under the same identifier replaces.
  private func installNotification(generation gen: Int, completion: ((Bool, String?) -> Void)?) {
    guard gen == generation, let rest = pendingRest, let content = rest.content else {
      completion?(true, nil)
      return
    }
    let floor = keepAlivePossible()
    // The same deadline the in-process timer uses, read now rather than when JS computed its rounded
    // duration. UNTimeIntervalNotificationTrigger aborts the process on a non-positive interval.
    let fireIn = rest.deadline.timeIntervalSinceNow + (floor ? notificationFloorDelay : 0)
    guard fireIn > 0 else {
      Logger.notifications.info("schedule skipped, rest \(rest.id) already elapsed")
      completion?(true, nil)
      return
    }
    pendingRest?.floorApplied = floor

    let identifier = notificationId(rest.id)
    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: fireIn, repeats: false)
    let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)
    center.add(request) { error in
      if let error = error {
        Logger.notifications.error("schedule failed: \(error.localizedDescription)")
        completion?(false, "notifications")
        return
      }
      DispatchQueue.main.async {
        if gen != self.generation {
          Logger.notifications.info("removing rest \(rest.id), it was stopped while its notification was added")
          self.center.removePendingNotificationRequests(withIdentifiers: [identifier])
        } else {
          Logger.notifications.info("schedule ok for rest \(rest.id), fires in \(fireIn)s, floor \(floor)")
        }
      }
      completion?(true, nil)
    }
  }

  private func keepAlivePossible() -> Bool {
    LiftosaurWatchImpl.shared.isWatchPaired() && LiftosaurTimerImpl.hasHeadphoneRoute()
  }

  @objc func stopTimer() {
    DispatchQueue.main.async {
      self.generation += 1
      let pending = self.pendingRest
      self.pendingRest = nil
      self.deadlineTimer?.cancel()
      self.deadlineTimer = nil
      self.stopKeepAlive()
      if let pending = pending {
        self.center.removePendingNotificationRequests(withIdentifiers: [self.notificationId(pending.id)])
      }
      self.removeTimerRequests()
    }
  }

  private func armDeadline(_ rest: PendingRest, generation gen: Int) {
    deadlineTimer?.cancel()
    deadlineTimer = nil
    let remaining = rest.deadline.timeIntervalSinceNow
    guard remaining > 0 else { return }
    let timer = DispatchSource.makeTimerSource(queue: .main)
    timer.schedule(deadline: .now() + remaining)
    timer.setEventHandler { [weak self] in
      self?.deadlineTimer = nil
      self?.deadlineReached(generation: gen)
    }
    deadlineTimer = timer
    timer.resume()
  }

  // Three producers, one per state: JS in the foreground, this timer with a running keep-alive on
  // headphones, the notification otherwise. The state is read here, not where the keep-alive started.
  private func deadlineReached(generation gen: Int) {
    guard gen == generation, let rest = pendingRest else { return }
    if UIApplication.shared.applicationState == .active {
      stopKeepAlive()
      center.removePendingNotificationRequests(withIdentifiers: [notificationId(rest.id)])
      Logger.notifications.info("deadline in the foreground, JS plays rest \(rest.id)")
      return
    }
    guard keepAlivePlayer?.isPlaying == true, LiftosaurTimerImpl.hasHeadphoneRoute() else {
      stopKeepAlive()
      Logger.notifications.info("deadline without a keep-alive on headphones, the notification plays rest \(rest.id)")
      return
    }
    stopKeepAlive()
    if rest.vibration {
      AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
    }
    guard let url = Bundle.main.url(forResource: "notification", withExtension: "m4r"),
          let player = preparedCuePlayer(url: url, volume: rest.volume),
          player.play() else {
      Logger.notifications.error("deadline cue could not play, the notification stays")
      return
    }
    audioPlayer = player
    center.removePendingNotificationRequests(withIdentifiers: [notificationId(rest.id)])
    let route = AVAudioSession.sharedInstance().currentRoute.outputs.map { $0.portType.rawValue }.joined(separator: ",")
    Logger.notifications.info("deadline cue played for rest \(rest.id) on \(route)")
  }

  private func startKeepAliveIfNeeded() {
    guard keepAlivePlayer == nil, let rest = pendingRest, rest.deadline > Date(), rest.volume > 0 else { return }
    guard UIApplication.shared.applicationState != .active else { return }
    guard keepAlivePossible() else { return }
    do {
      try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])
      try AVAudioSession.sharedInstance().setActive(true, options: [])
      let player = try AVAudioPlayer(data: LiftosaurTimerImpl.silence, fileTypeHint: AVFileType.wav.rawValue)
      player.numberOfLoops = -1
      player.volume = 0
      guard player.prepareToPlay(), player.play() else {
        Logger.notifications.error("keep-alive could not start")
        try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
        return
      }
      keepAlivePlayer = player
      Logger.notifications.info("keep-alive started for rest \(rest.id), \(Int(rest.deadline.timeIntervalSinceNow))s left")
      if !rest.floorApplied {
        Logger.notifications.info("moving the notification for rest \(rest.id) behind the deadline")
        installNotification(generation: generation, completion: nil)
      }
    } catch {
      Logger.notifications.error("keep-alive setup failed: \(error)")
      try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
    }
  }

  private func stopKeepAlive() {
    guard let player = keepAlivePlayer else { return }
    player.stop()
    keepAlivePlayer = nil
    try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
    Logger.notifications.info("keep-alive stopped")
  }

  @objc private func appDidEnterBackground() {
    DispatchQueue.main.async { self.startKeepAliveIfNeeded() }
  }

  @objc private func appDidBecomeActive() {
    DispatchQueue.main.async { self.stopKeepAlive() }
  }

  @objc private func audioRouteChanged() {
    DispatchQueue.main.async {
      if LiftosaurTimerImpl.hasHeadphoneRoute() {
        self.startKeepAliveIfNeeded()
      } else if self.keepAlivePlayer != nil {
        Logger.notifications.info("headphones gone, the notification stays as the cue")
        self.stopKeepAlive()
      }
    }
  }

  @objc private func audioInterrupted(_ notification: Notification) {
    guard let raw = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
          let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
    DispatchQueue.main.async {
      switch type {
      case .began:
        self.keepAlivePlayer = nil
      case .ended:
        self.startKeepAliveIfNeeded()
      @unknown default:
        break
      }
    }
  }

  @objc private func mediaServicesReset() {
    DispatchQueue.main.async {
      self.keepAlivePlayer = nil
      self.startKeepAliveIfNeeded()
    }
  }

  // One second of 16-bit mono silence as a WAV, so the keep-alive needs no bundled asset.
  private static let silence: Data = {
    let sampleRate: UInt32 = 44_100
    let dataSize = sampleRate * 2
    var wav = Data()
    func u32(_ value: UInt32) { var le = value.littleEndian; wav.append(Data(bytes: &le, count: 4)) }
    func u16(_ value: UInt16) { var le = value.littleEndian; wav.append(Data(bytes: &le, count: 2)) }
    wav.append(contentsOf: Array("RIFF".utf8)); u32(36 + dataSize); wav.append(contentsOf: Array("WAVE".utf8))
    wav.append(contentsOf: Array("fmt ".utf8)); u32(16); u16(1); u16(1); u32(sampleRate); u32(sampleRate * 2); u16(2); u16(16)
    wav.append(contentsOf: Array("data".utf8)); u32(dataSize); wav.append(Data(count: Int(dataSize)))
    return wav
  }()

  @objc func scheduleReminder(duration: Double,
                              title: String,
                              body: String,
                              completion: @escaping (Bool, String?) -> Void) {
    Logger.notifications.info("scheduleReminder duration=\(duration)")
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
        Logger.notifications.error("reminder schedule failed: \(error.localizedDescription)")
        completion(false, "notifications")
      } else {
        Logger.notifications.info("reminder scheduled, fires in \(duration)s")
        completion(true, nil)
      }
    }
  }

  @objc func cancelReminder() {
    Logger.notifications.info("cancelReminder")
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
      guard let player = self.preparedCuePlayer(url: url, volume: volume) else { return }
      if player.play() {
        self.audioPlayer = player
      } else {
        Logger.notifications.error("\(resource): play() returned false")
        try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
      }
    }
  }

  // .playback so the cue is audible over a podcast on AirPods, set before prepareToPlay(): prepare
  // opens the hardware with the current category, and a backgrounded app cannot with .soloAmbient.
  private func preparedCuePlayer(url: URL, volume: Double) -> AVAudioPlayer? {
    do {
      try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.duckOthers, .mixWithOthers])
      try AVAudioSession.sharedInstance().setActive(true, options: [])
      let player = try AVAudioPlayer(contentsOf: url)
      player.delegate = TimerAudioSessionDeactivator.shared
      player.volume = Float(min(max(volume, 0), 1))
      if player.prepareToPlay() {
        return player
      }
      Logger.notifications.error("cue could not prepare")
    } catch {
      Logger.notifications.error("cue audio setup failed: \(error)")
    }
    try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
    return nil
  }

  private static func hasHeadphoneRoute() -> Bool {
    let ports: Set<AVAudioSession.Port> = [
      .bluetoothA2DP, .bluetoothHFP, .bluetoothLE, .headphones, .airPlay, .usbAudio,
    ]
    return AVAudioSession.sharedInstance().currentRoute.outputs.contains { ports.contains($0.portType) }
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
    // A chirp that ends after the next rest's keep-alive started must not close that session.
    guard LiftosaurTimerImpl.shared.keepAlivePlayer == nil else { return }
    try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
  }
}
