import "mocha";
import { expect } from "chai";
import {
  NotificationPrefs_isOn,
  NotificationPrefs_reconcile,
  NotificationPrefs_reminder,
  NotificationPrefs_statusRow,
  NotificationPrefs_toggle,
} from "../src/models/notificationPrefs";
import { Storage_getDefault } from "../src/models/storage";
import { Progress_scheduleTimerNotification } from "../src/models/progress";
import { INativeEffect } from "../src/models/nativeEffects";
import { ISettings } from "../src/types";
import { FriendsFixtures_entry, FriendsFixtures_record } from "./friendsFixtures";

function settings(notifications?: ISettings["notifications"]): ISettings {
  const base = Storage_getDefault().settings;
  return { ...base, timers: { ...base.timers, reminder: 1800 }, notifications };
}

describe("NotificationPrefs", () => {
  it("treats a missing switch as on", () => {
    expect(NotificationPrefs_isOn(settings(), "reactions")).to.equal(true);
    expect(NotificationPrefs_isOn(settings({ reactions: false }), "reactions")).to.equal(false);
    expect(NotificationPrefs_isOn(settings({ reactions: false }), "friendRequests")).to.equal(true);
  });

  it("drops the workout reminder with the rest timer switch", () => {
    expect(NotificationPrefs_reminder(settings())).to.equal(1800);
    expect(NotificationPrefs_reminder(settings({ restTimer: false }))).to.equal(undefined);
  });

  it("asks before the first prompt, and sends people to settings after a denial", () => {
    expect(NotificationPrefs_statusRow("notDetermined")).to.include({ kind: "shown", action: "request" });
    expect(NotificationPrefs_statusRow("denied")).to.include({ kind: "shown", action: "openSettings" });
    expect(NotificationPrefs_statusRow("granted")).to.eql({ kind: "none" });
    expect(NotificationPrefs_statusRow("unavailable")).to.eql({ kind: "none" });
    expect(NotificationPrefs_statusRow(undefined)).to.eql({ kind: "none" });
  });

  it("keeps the other switches and asks for permission only when turning one on before the first prompt", () => {
    const current = settings({ reactions: false });
    expect(NotificationPrefs_toggle(current, "restTimer", true, "notDetermined")).to.eql({
      notifications: { reactions: false, restTimer: true },
      permissionAction: "request",
    });
    expect(NotificationPrefs_toggle(current, "restTimer", false, "notDetermined").permissionAction).to.equal("none");
    expect(NotificationPrefs_toggle(current, "restTimer", true, "denied").permissionAction).to.equal("none");
  });

  describe("reconcile", () => {
    const running = FriendsFixtures_record(0, "2026-11-01T10:00:00.000Z", { intervals: [[1000, undefined]] });
    const paused = FriendsFixtures_record(0, "2026-11-01T10:00:00.000Z", { intervals: [[1000, 2000]] });

    it("cancels the rest timer and the reminder when the switch goes off, from any source", () => {
      expect(NotificationPrefs_reconcile(settings(), settings({ restTimer: false }), running)).to.eql([
        { type: "stopTimer" },
        { type: "setWorkoutReminder", reminder: 0 },
      ]);
      expect(NotificationPrefs_reconcile(settings(), settings({ restTimer: false }), paused)).to.eql([
        { type: "stopTimer" },
        { type: "setWorkoutReminder", reminder: 0 },
      ]);
    });

    it("brings the reminder back only for a running workout", () => {
      expect(NotificationPrefs_reconcile(settings({ restTimer: false }), settings(), running)).to.eql([
        { type: "setWorkoutReminder", reminder: 1800 },
      ]);
      expect(NotificationPrefs_reconcile(settings({ restTimer: false }), settings(), paused)).to.eql([]);
    });

    it("does nothing when the rest timer switch did not change, or without a workout", () => {
      expect(NotificationPrefs_reconcile(settings(), settings({ reactions: false }), running)).to.eql([]);
      expect(
        NotificationPrefs_reconcile(settings({ restTimer: false }), settings({ restTimer: false }), running)
      ).to.eql([]);
      expect(NotificationPrefs_reconcile(settings(), settings({ restTimer: false }), undefined)).to.eql([]);
    });
  });

  it("stops the rest timer notification instead of scheduling it when the switch is off", () => {
    const record = FriendsFixtures_record(0, "2026-11-01T10:00:00.000Z", { entries: [FriendsFixtures_entry()] });
    const on: INativeEffect[] = [];
    Progress_scheduleTimerNotification(on, record, 0, "workout", settings(), 90, 1000, 90);
    expect(on.map((e) => e.type)).to.eql(["startTimer"]);
    const off: INativeEffect[] = [];
    Progress_scheduleTimerNotification(off, record, 0, "workout", settings({ restTimer: false }), 90, 1000, 90);
    expect(off).to.eql([{ type: "stopTimer" }]);
  });
});
