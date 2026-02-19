/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import {
  VersionTracker,
  IVersions,
  IVersionsObject,
  ICollectionVersions,
  IVersionTypes,
  IVectorClock,
} from "../../src/models/versionTracker";
import { IAtomicType, IControlledType, ISubscriptionReceipt, STORAGE_VERSION_TYPES } from "../../src/types";
import { Storage } from "../../src/models/storage";
import { IStorage, IProgram, IHistoryRecord, ICustomExercise, IHistoryEntry } from "../../src/types";
import { ObjectUtils } from "../../src/utils/object";
import { UidFactory } from "../../src/utils/generator";

describe("VersionTracker", () => {
  describe("vector clocks", () => {
    it("should create vector clock versions when deviceId is provided", () => {
      const trackerWithDevice = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc123" });
      const oldStorage = Storage.getDefault();
      const newStorage = { ...oldStorage, currentProgramId: "program-123" };
      const timestamp = 1000;

      const versions = trackerWithDevice.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      expect(versions.currentProgramId).to.be.an("object");
      expect((versions.currentProgramId as any).vc).to.deep.equal({ web_abc123: 1 });
      expect((versions.currentProgramId as any).t).to.equal(timestamp);
    });

    it("should create plain timestamp versions when deviceId is not provided", () => {
      const trackerNoDevice = new VersionTracker(STORAGE_VERSION_TYPES);
      const oldStorage = Storage.getDefault();
      const newStorage = { ...oldStorage, currentProgramId: "program-123" };
      const timestamp = 1000;

      const versions = trackerNoDevice.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      expect(versions.currentProgramId).to.equal(timestamp);
    });

    it("should increment vector clock counter for same device", () => {
      const trackerWithDevice = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc123" });
      const storage1 = Storage.getDefault();
      const storage2 = { ...storage1, currentProgramId: "program-1" };
      const storage3 = { ...storage2, currentProgramId: "program-2" };

      const versions1 = trackerWithDevice.updateVersions(storage1, storage2, {}, {}, 1000);
      const versions2 = trackerWithDevice.updateVersions(storage2, storage3, versions1, {}, 2000);

      expect((versions2.currentProgramId as any).vc).to.deep.equal({ web_abc123: 2 });
      expect((versions2.currentProgramId as any).t).to.equal(2000);
    });

    it("should detect sequential changes (a happened-before b)", () => {
      const trackerDevice1 = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc" });
      const trackerDevice2 = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "ios_xyz" });

      // Device 1 makes first change
      const storage1 = Storage.getDefault();
      const storage2 = { ...storage1, currentProgramId: "program-1" };
      const versions1 = trackerDevice1.updateVersions(storage1, storage2, {}, {}, 1000);
      // versions1.currentProgramId = { vc: { web_abc: 1 }, t: 1000 }

      // Device 2 receives that change and makes another
      const storage3 = { ...storage2, currentProgramId: "program-2" };
      const versions2 = trackerDevice2.updateVersions(storage2, storage3, versions1, {}, 2000);
      // versions2.currentProgramId = { vc: { web_abc: 1, ios_xyz: 1 }, t: 2000 }

      // When merging, device 2's change should win (it's newer)
      const fullObj = { currentProgramId: "program-1" };
      const fullVersions = { currentProgramId: versions1.currentProgramId };
      const diffVersions = { currentProgramId: versions2.currentProgramId };
      const extractedObj = { currentProgramId: "program-2" };

      const merged = trackerDevice1.mergeByVersions(fullObj, fullVersions, diffVersions, extractedObj);
      expect(merged.currentProgramId).to.equal("program-2");
    });

    it("should detect concurrent changes and use timestamp as tiebreaker", () => {
      const trackerDevice1 = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc" });
      const trackerDevice2 = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "ios_xyz" });

      // Device 1 makes a change
      const storage1 = Storage.getDefault();
      const storage2Web = { ...storage1, currentProgramId: "program-web" };
      const versionsWeb = trackerDevice1.updateVersions(storage1, storage2Web, {}, {}, 1000);
      // versionsWeb.currentProgramId = { vc: { web_abc: 1 }, t: 1000 }

      // Device 2 makes a concurrent change (doesn't know about device 1's change)
      const storage2Ios = { ...storage1, currentProgramId: "program-ios" };
      const versionsIos = trackerDevice2.updateVersions(storage1, storage2Ios, {}, {}, 2000);
      // versionsIos.currentProgramId = { vc: { ios_xyz: 1 }, t: 2000 }

      // When merging concurrent changes, higher timestamp should win
      const fullObj = { currentProgramId: "program-web" };
      const fullVersions = { currentProgramId: versionsWeb.currentProgramId };
      const diffVersions = { currentProgramId: versionsIos.currentProgramId };
      const extractedObj = { currentProgramId: "program-ios" };

      const merged = trackerDevice1.mergeByVersions(fullObj, fullVersions, diffVersions, extractedObj);
      expect(merged.currentProgramId).to.equal("program-ios"); // iOS wins due to higher timestamp
    });

    it("should handle three-way merge with sequential changes", () => {
      const trackerDevice1 = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc" });
      const trackerDevice2 = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "ios_xyz" });

      // Device 1 makes a change
      const storage1 = Storage.getDefault();
      const storage2Web = { ...storage1, currentProgramId: "program-web" };
      const versionsWeb = trackerDevice1.updateVersions(storage1, storage2Web, {}, {}, 3000);

      // Device 2 receives device 1's change and makes another change on top
      const storage3Ios = { ...storage2Web, currentProgramId: "program-ios" };
      const versionsIos = trackerDevice2.updateVersions(storage2Web, storage3Ios, versionsWeb, {}, 4000);

      // When merging, iOS should win because it happened after web's change
      const fullObj = { currentProgramId: "program-web" };
      const fullVersions = { currentProgramId: versionsWeb.currentProgramId };
      const diffVersions = { currentProgramId: versionsIos.currentProgramId };
      const extractedObj = { currentProgramId: "program-ios" };

      const merged = trackerDevice1.mergeByVersions(fullObj, fullVersions, diffVersions, extractedObj);
      expect(merged.currentProgramId).to.equal("program-ios"); // iOS wins because it's sequential (newer)
    });

    it("should handle mixed vector clock and plain timestamp versions", () => {
      const trackerWithDevice = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc" });

      // Start with plain timestamp (old version without deviceId)
      const storage1 = Storage.getDefault();
      const storage2 = { ...storage1, currentProgramId: "program-1" };
      const versionsPlain = { currentProgramId: 1000 }; // Plain timestamp

      // New change with vector clock
      const storage3 = { ...storage2, currentProgramId: "program-2" };
      const versionsNew = trackerWithDevice.updateVersions(storage2, storage3, versionsPlain, {}, 2000);

      // Should create vector clock from plain timestamp
      expect((versionsNew.currentProgramId as any).vc).to.deep.equal({ web_abc: 1 });
      expect((versionsNew.currentProgramId as any).t).to.equal(2000);
    });

    it("should merge vector clock versions correctly", () => {
      const trackerDevice1 = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc" });

      const fullVersions = {
        name: { vc: { web_abc: 2, ios_xyz: 1 }, t: 2000 },
        age: { vc: { web_abc: 1 }, t: 1000 },
      };

      const diffVersions = {
        name: { vc: { web_abc: 1, ios_xyz: 2 }, t: 3000 },
        email: { vc: { ios_xyz: 1 }, t: 1500 },
      };

      const merged = trackerDevice1.mergeVersions(fullVersions, diffVersions);

      // name: concurrent change, diff has higher timestamp, should use diff
      expect((merged.name as any).t).to.equal(3000);

      // age: only in full, should keep full
      expect((merged.age as any).vc).to.deep.equal({ web_abc: 1 });
      expect((merged.age as any).t).to.equal(1000);

      // email: only in diff, should use diff
      const mergedAny = merged as any;
      expect(mergedAny.email.vc).to.deep.equal({ ios_xyz: 1 });
      expect(mergedAny.email.t).to.equal(1500);
    });

    it("should use plain timestamps for deletions even with deviceId", () => {
      const trackerWithDevice = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc" });

      const program1: IProgram = {
        vtype: "program",
        id: "prog1",
        clonedAt: 1,
        name: "Program 1",
        description: "",
        url: "",
        author: "",
        nextDay: 1,
        days: [],
        weeks: [],
        exercises: [],
        isMultiweek: false,
        tags: [],
      };

      const oldStorage = {
        ...Storage.getDefault(),
        programs: [program1],
      };

      const newStorage = {
        ...oldStorage,
        programs: [],
      };

      const timestamp = 1000;
      const versions = trackerWithDevice.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      const programVersions = versions.programs as ICollectionVersions;
      // Deletion should be plain timestamp, not vector clock
      expect(programVersions.deleted!["1"]).to.equal(timestamp);
      expect(typeof programVersions.deleted!["1"]).to.equal("number");
    });

    it("should compare equal vector clocks correctly", () => {
      const trackerDevice1 = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc" });

      const storage1 = Storage.getDefault();
      const storage2 = { ...storage1, currentProgramId: "program-1" };
      const versions1 = trackerDevice1.updateVersions(storage1, storage2, {}, {}, 1000);

      // Try to merge with itself - should keep original
      const fullObj = { currentProgramId: "program-1" };
      const fullVersions = { currentProgramId: versions1.currentProgramId };
      const diffVersions = { currentProgramId: versions1.currentProgramId };
      const extractedObj = { currentProgramId: "program-1" };

      const merged = trackerDevice1.mergeByVersions(fullObj, fullVersions, diffVersions, extractedObj);
      expect(merged.currentProgramId).to.equal("program-1");
    });

    it("should work with vector clocks in nested structures", () => {
      const trackerWithDevice = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc" });

      const oldStorage = Storage.getDefault();
      const newStorage = {
        ...oldStorage,
        settings: {
          ...oldStorage.settings,
          volume: 75,
        },
      };

      const timestamp = 1000;
      const versions = trackerWithDevice.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      expect((versions.settings as any).volume).to.be.an("object");
      expect((versions.settings as any).volume.vc).to.deep.equal({ web_abc: 1 });
      expect((versions.settings as any).volume.t).to.equal(timestamp);
    });

    it("should work with vector clocks in collections", () => {
      const trackerWithDevice = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "ios_xyz" });

      const program: IProgram = {
        vtype: "program",
        id: "prog1",
        clonedAt: 1,
        name: "Program 1",
        description: "",
        url: "",
        author: "",
        nextDay: 1,
        days: [],
        weeks: [],
        exercises: [],
        isMultiweek: false,
        tags: [],
      };

      const updatedProgram: IProgram = {
        ...program,
        name: "Updated Program",
      };

      const oldStorage = {
        ...Storage.getDefault(),
        programs: [program],
      };

      const newStorage = {
        ...oldStorage,
        programs: [updatedProgram],
      };

      const timestamp = 1000;
      const versions = trackerWithDevice.updateVersions(oldStorage, newStorage, {}, {}, timestamp);

      const programVersions = versions.programs as ICollectionVersions;
      const itemVersion = programVersions.items!["1"] as any;

      expect(itemVersion.name).to.be.an("object");
      expect(itemVersion.name.vc).to.deep.equal({ ios_xyz: 1 });
      expect(itemVersion.name.t).to.equal(timestamp);
    });

    it("should preserve vector clock counters during concurrent merges (no regression)", () => {
      const trackerA = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc" });
      const trackerB = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "ios_xyz" });

      // Device A makes 2 changes
      const storage1 = Storage.getDefault();
      const storage2 = { ...storage1, currentProgramId: "program-1" };
      const versionsA1 = trackerA.updateVersions(storage1, storage2, {}, {}, 1000);
      // versionsA1.currentProgramId = { vc: { web_abc: 1 }, t: 1000 }

      const storage3 = { ...storage2, currentProgramId: "program-2" };
      const versionsA2 = trackerA.updateVersions(storage2, storage3, versionsA1, {}, 2000);
      // versionsA2.currentProgramId = { vc: { web_abc: 2 }, t: 2000 }

      // Device B makes a concurrent change (doesn't know about Device A's changes)
      const storage4 = { ...storage1, currentProgramId: "program-B" };
      const versionsB = trackerB.updateVersions(storage1, storage4, {}, {}, 3000);
      // versionsB.currentProgramId = { vc: { ios_xyz: 1 }, t: 3000 }

      // Device A merges B's version (concurrent conflict)
      const mergedVersions = trackerA.mergeVersions(versionsA2, versionsB);

      // The merged version should have BOTH counters (web_abc: 2, ios_xyz: 1)
      const mergedVc = (mergedVersions.currentProgramId as any).vc;
      expect(mergedVc.web_abc).to.equal(2); // ✓ Preserved from A
      expect(mergedVc.ios_xyz).to.equal(1); // ✓ Preserved from B

      // Now Device A makes another change - counter should increment from 2 to 3
      const storage5 = { ...storage3, currentProgramId: "program-3" };
      const versionsA3 = trackerA.updateVersions(storage3, storage5, mergedVersions, {}, 4000);

      const finalVc = (versionsA3.currentProgramId as any).vc;
      expect(finalVc.web_abc).to.equal(3); // ✓ No regression! (was 2, now 3)
      expect(finalVc.ios_xyz).to.equal(1); // ✓ Still preserved
    });

    it("should not lose data when mixing vector clocks with plain timestamps (migration safety)", () => {
      const trackerWithDevice = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc" });
      const trackerNoDevice = new VersionTracker(STORAGE_VERSION_TYPES); // Old client

      // Old client (no vector clocks) makes a change at time 5000
      const storage1 = Storage.getDefault();
      const storage2Old = { ...storage1, currentProgramId: "Latest Change" };
      const versionsOld = trackerNoDevice.updateVersions(storage1, storage2Old, {}, {}, 5000);
      // versionsOld.currentProgramId = 5000 (plain timestamp)

      // New client (with vector clocks) has an older change from time 1000
      const storage2New = { ...storage1, currentProgramId: "Old Change" };
      const versionsNew = trackerWithDevice.updateVersions(storage1, storage2New, {}, {}, 1000);
      // versionsNew.currentProgramId = { vc: { web_abc: 1 }, t: 1000 }

      // Merge: plain timestamp (5000) vs vector clock ({ web_abc: 1, t: 1000 })
      // Should use timestamp comparison: 5000 > 1000, so plain timestamp wins
      const fullObj = { currentProgramId: "Old Change" };
      const fullVersions = { currentProgramId: versionsNew.currentProgramId };
      const diffVersions = { currentProgramId: versionsOld.currentProgramId };
      const extractedObj = { currentProgramId: "Latest Change" };

      const merged = trackerWithDevice.mergeByVersions(fullObj, fullVersions, diffVersions, extractedObj);

      // ✓ Should preserve the newer value from the plain timestamp
      expect(merged.currentProgramId).to.equal("Latest Change");
    });

    it("should still upgrade to vector clocks after mixed-mode merge", () => {
      const trackerWithDevice = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc" });

      // Plain timestamp wins in merge (5000 > 1000)
      const plainTimestampVersion = 5000;
      const vectorClockVersion = { vc: { web_abc: 1 }, t: 1000 };

      // After merge, version is still plain timestamp
      const mergedVersions = trackerWithDevice.mergeVersions(
        { currentProgramId: vectorClockVersion },
        { currentProgramId: plainTimestampVersion }
      );

      expect(mergedVersions.currentProgramId).to.equal(5000); // Still plain timestamp

      // Now device with VC makes a change - should upgrade to vector clock
      const storage1 = { currentProgramId: "Value A" };
      const storage2 = { currentProgramId: "Value B" };
      const newVersions = trackerWithDevice.updateVersions(storage1, storage2, mergedVersions, {}, 6000);

      // ✓ Should now have vector clock (upgraded from plain timestamp)
      expect((newVersions.currentProgramId as any).vc).to.deep.equal({ web_abc: 1 });
      expect((newVersions.currentProgramId as any).t).to.equal(6000);
    });

    describe("preserving newVersion deviceIds (regression tests)", () => {
      it("should preserve deviceIds from newVersion when updating collection items", () => {
        const trackerWeb = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc" });
        const trackerIos = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "ios_xyz" });

        const program: IProgram = {
          vtype: "program",
          id: "prog1",
          clonedAt: 1,
          name: "Program 1",
          description: "",
          url: "",
          author: "",
          nextDay: 1,
          days: [],
          weeks: [],
          exercises: [],
          isMultiweek: false,
          tags: [],
        };

        // iOS device creates program
        const storage1 = { ...Storage.getDefault(), programs: [] };
        const storage2 = { ...storage1, programs: [program] };
        const versionsIos = trackerIos.updateVersions(storage1, storage2, {}, {}, 1000);
        // versionsIos.programs.items["1"].name = { vc: { ios_xyz: 1 }, t: 1000 }

        // Web device receives iOS's version and makes a change
        const updatedProgram = { ...program, name: "Updated Program" };
        const storage3 = { ...storage2, programs: [updatedProgram] };
        const versionsWeb = trackerWeb.updateVersions(storage2, storage3, {}, versionsIos, 2000);

        // Web's version should have BOTH device counters
        const programVersions = versionsWeb.programs as ICollectionVersions;
        const nameVersion = (programVersions.items!["1"] as any).name;

        expect(nameVersion.vc.ios_xyz).to.equal(1); // ✓ Preserved from iOS
        expect(nameVersion.vc.web_abc).to.equal(1); // ✓ Added by Web
        expect(nameVersion.t).to.equal(2000);
      });

      it("should preserve deviceIds from newVersion when updating dictionary items", () => {
        const trackerWeb = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc" });
        const trackerIos = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "ios_xyz" });

        const customExercise: ICustomExercise = {
          isDeleted: false,
          vtype: "custom_exercise",
          id: "custom-ex",
          name: "Custom Ex",
          types: [],
          meta: {
            bodyParts: [],
            targetMuscles: [],
            synergistMuscles: [],
          },
        };

        // iOS device creates a custom exercise
        const storage1 = {
          ...Storage.getDefault(),
          settings: {
            ...Storage.getDefault().settings,
            exercises: { "custom-ex": customExercise },
          },
        };
        const storage2 = {
          ...storage1,
          settings: {
            ...storage1.settings,
            exercises: { "custom-ex": { ...customExercise, name: "Custom Exercise" } },
          },
        };
        const versionsIos = trackerIos.updateVersions(storage1, storage2, {}, {}, 1000);

        // Web device receives iOS's version and makes another change
        const storage3 = {
          ...storage2,
          settings: {
            ...storage2.settings,
            exercises: { "custom-ex": { ...customExercise, name: "Custom Exercise Updated" } },
          },
        };
        const versionsWeb = trackerWeb.updateVersions(storage2, storage3, {}, versionsIos, 2000);

        // Web's version should have BOTH device counters
        const settingsVersions = versionsWeb.settings as any;
        const exercisesVersions = settingsVersions.exercises as ICollectionVersions;
        const customExVersion = exercisesVersions.items!["custom-ex"] as IVectorClock;

        // Should preserve ios_xyz and add web_abc
        expect(customExVersion.vc.ios_xyz).to.equal(1);
        expect(customExVersion.vc.web_abc).to.equal(1);
        expect(customExVersion.t).to.equal(2000);
      });

      it("should preserve deviceIds from newVersion for non-trackable arrays", () => {
        const trackerWeb = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc" });
        const trackerIos = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "ios_xyz" });

        // iOS device modifies a non-trackable array
        const storage1 = {
          ...Storage.getDefault(),
          settings: { ...Storage.getDefault().settings, timers: [30, 60] },
        };
        const storage2 = {
          ...storage1,
          settings: { ...storage1.settings, timers: [45, 90] },
        };
        const versionsIos = trackerIos.updateVersions(storage1, storage2, {}, {}, 1000);

        // Web device receives iOS's version and makes another change
        const storage3 = {
          ...storage2,
          settings: { ...storage2.settings, timers: [45, 90, 120] },
        };
        const versionsWeb = trackerWeb.updateVersions(storage2, storage3, {}, versionsIos, 2000);

        // Web's version should have BOTH device counters
        const timersVersion = (versionsWeb.settings as any).timers as IVectorClock;
        expect(timersVersion.vc.ios_xyz).to.equal(1); // ✓ Preserved from iOS
        expect(timersVersion.vc.web_abc).to.equal(1); // ✓ Added by Web
        expect(timersVersion.t).to.equal(2000);
      });

      it("should preserve deviceIds from newVersion for controlled objects", () => {
        const trackerWeb = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc" });
        const trackerIos = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "ios_xyz" });

        const program: IProgram = {
          vtype: "program",
          id: "prog1",
          clonedAt: 1,
          name: "Program 1",
          description: "",
          url: "",
          author: "",
          nextDay: 1,
          days: [],
          weeks: [],
          exercises: [],
          isMultiweek: false,
          tags: [],
        };

        // iOS device creates program and updates name
        const storage1 = { ...Storage.getDefault(), programs: [program] };
        const storage2 = { ...storage1, programs: [{ ...program, name: "Updated by iOS" }] };
        const versionsIos = trackerIos.updateVersions(storage1, storage2, {}, {}, 1000);

        // Web device receives iOS's version and updates name again
        const storage3 = { ...storage2, programs: [{ ...program, name: "Updated by Web" }] };
        const versionsWeb = trackerWeb.updateVersions(storage2, storage3, {}, versionsIos, 2000);

        // Web's version should have BOTH device counters
        const programVersions = versionsWeb.programs as ICollectionVersions;
        const nameVersion = (programVersions.items!["1"] as any).name as IVectorClock;

        expect(nameVersion.vc.ios_xyz).to.equal(1); // ✓ Preserved from iOS
        expect(nameVersion.vc.web_abc).to.equal(1); // ✓ Added by Web
        expect(nameVersion.t).to.equal(2000);
      });

      it("should preserve deviceIds from newVersion for atomic objects", () => {
        const trackerWeb = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc" });
        const trackerIos = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "ios_xyz" });

        const record: IHistoryRecord = {
          vtype: "history_record",
          id: 1,
          date: "2024-01-01",
          programId: "prog1",
          programName: "Program 1",
          dayName: "Day 1",
          day: 1,
          entries: [],
          startTime: 0,
          endTime: 0,
        };

        // iOS device creates history record
        const storage1 = { ...Storage.getDefault(), history: [] };
        const storage2 = { ...storage1, history: [record] };
        const versionsIos = trackerIos.updateVersions(storage1, storage2, {}, {}, 1000);

        // Web device receives iOS's version and modifies the record
        const updatedRecord = { ...record, dayName: "Updated Day" };
        const storage3 = { ...storage2, history: [updatedRecord] };
        const versionsWeb = trackerWeb.updateVersions(storage2, storage3, {}, versionsIos, 2000);

        // Web's version should have BOTH device counters
        const historyVersions = versionsWeb.history as ICollectionVersions;
        const recordVersion = historyVersions.items!["1"] as IVectorClock;

        expect(recordVersion.vc.ios_xyz).to.equal(1); // ✓ Preserved from iOS
        expect(recordVersion.vc.web_abc).to.equal(1); // ✓ Added by Web
        expect(recordVersion.t).to.equal(2000);
      });

      it("should preserve deviceIds from newVersion for primitive values", () => {
        const trackerWeb = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc" });
        const trackerIos = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "ios_xyz" });

        // iOS device changes currentProgramId
        const storage1 = Storage.getDefault();
        const storage2 = { ...storage1, currentProgramId: "program-1" };
        const versionsIos = trackerIos.updateVersions(storage1, storage2, {}, {}, 1000);

        // Web device receives iOS's version and changes it again
        const storage3 = { ...storage2, currentProgramId: "program-2" };
        const versionsWeb = trackerWeb.updateVersions(storage2, storage3, {}, versionsIos, 2000);

        // Web's version should have BOTH device counters
        const version = versionsWeb.currentProgramId as IVectorClock;
        expect(version.vc.ios_xyz).to.equal(1); // ✓ Preserved from iOS
        expect(version.vc.web_abc).to.equal(1); // ✓ Added by Web
        expect(version.t).to.equal(2000);
      });

      it("should preserve deviceIds through multiple syncs", () => {
        const trackerWeb = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc" });
        const trackerIos = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "ios_xyz" });
        const trackerAndroid = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "android_def" });

        // iOS makes first change
        const storage1 = Storage.getDefault();
        const storage2 = { ...storage1, currentProgramId: "program-1" };
        const versionsIos = trackerIos.updateVersions(storage1, storage2, {}, {}, 1000);

        // Web receives iOS's change and makes another
        const storage3 = { ...storage2, currentProgramId: "program-2" };
        const versionsWeb = trackerWeb.updateVersions(storage2, storage3, {}, versionsIos, 2000);

        // Android receives Web's change and makes another
        const storage4 = { ...storage3, currentProgramId: "program-3" };
        const versionsAndroid = trackerAndroid.updateVersions(storage3, storage4, {}, versionsWeb, 3000);

        // Android's version should have ALL three device counters
        const version = versionsAndroid.currentProgramId as IVectorClock;
        expect(version.vc.ios_xyz).to.equal(1); // ✓ Preserved from iOS
        expect(version.vc.web_abc).to.equal(1); // ✓ Preserved from Web
        expect(version.vc.android_def).to.equal(1); // ✓ Added by Android
        expect(version.t).to.equal(3000);
      });
    });

    describe("field-by-field merge for controlled objects in collections", () => {
      it("should merge controlled objects field-by-field in array collections, not take entire object", () => {
        const trackerWeb = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "web_abc" });
        const trackerIos = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "ios_xyz" });

        // Initial state with a program
        const storage1 = Storage.getDefault();
        const program: IProgram = {
          vtype: "program",
          id: "test-program",
          clonedAt: 1,
          name: "Test Program",
          exercises: [],
          description: "",
          url: "",
          author: "",
          isMultiweek: false,
          tags: [],
          days: [],
          nextDay: 1,
          weeks: [],
        };
        storage1.programs = [program];
        const versions1 = trackerWeb.fillVersions(storage1, {}, 1000);

        // iOS modifies only the 'name' field
        const storage2 = ObjectUtils.clone(storage1);
        storage2.programs[0].name = "Modified by iOS";
        const versions2 = trackerIos.updateVersions(storage1, storage2, versions1, {}, 2000);

        // Web modifies only the 'nextDay' field (concurrent change)
        const storage3 = ObjectUtils.clone(storage1);
        storage3.programs[0].nextDay = 2;
        const versions3 = trackerWeb.updateVersions(storage1, storage3, versions1, {}, 2500);

        // Extract iOS changes for sync
        const versionDiff2 = trackerIos.diffVersions(versions1, versions2);
        const extractedIos = trackerIos.extractByVersions(storage2, versionDiff2!);

        // Merge iOS changes into Web's state
        const mergedStorage = trackerWeb.mergeByVersions(storage3, versions3, versionDiff2!, extractedIos);

        // CRITICAL: The merged program should have BOTH changes:
        // - name from iOS (newer)
        // - nextDay from Web (concurrent, but this is the local value)
        expect(mergedStorage.programs[0].name).to.equal("Modified by iOS");
        expect(mergedStorage.programs[0].nextDay).to.equal(2); // Should NOT be lost!

        // Verify versions are properly merged
        const mergedVersions = trackerWeb.mergeVersions(versions3, versionDiff2!);
        const programVersions = (mergedVersions.programs as ICollectionVersions).items!["1"] as IVersionsObject;
        expect((programVersions.name as IVectorClock).vc.ios_xyz).to.equal(1);
        expect((programVersions.nextDay as IVectorClock).vc.web_abc).to.equal(2);
      });
    });
  });

  describe("tombstone compaction", () => {
    it("should compact old tombstones when merging versions", () => {
      const versionTypes: IVersionTypes<IAtomicType, IControlledType> = {
        ...STORAGE_VERSION_TYPES,
        compactionThresholds: {
          "subscription.apple": 14 * 24 * 60 * 60 * 1000,
          "subscription.google": 14 * 24 * 60 * 60 * 1000,
        },
      };
      const tracker = new VersionTracker(versionTypes);

      const now = Date.now();
      const oldTimestamp = now - 15 * 24 * 60 * 60 * 1000;
      const recentTimestamp = now - 5 * 24 * 60 * 60 * 1000;

      const fullVersions: IVersions<IStorage> = {
        subscription: {
          apple: {
            items: {},
            deleted: {
              "old-receipt": oldTimestamp,
              "recent-receipt": recentTimestamp,
            },
          },
        },
      };

      const versionDiff: IVersions<IStorage> = {
        subscription: {
          apple: {
            items: {},
            deleted: {},
          },
        },
      };

      const merged = tracker.mergeVersions(fullVersions, versionDiff);
      const appleDeleted = (merged.subscription as any).apple.deleted;

      expect(appleDeleted["old-receipt"]).to.be.undefined;

      expect(appleDeleted["recent-receipt"]).to.equal(recentTimestamp);
    });

    it("should keep tombstones when no threshold is configured", () => {
      const versionTypes: IVersionTypes<IAtomicType, IControlledType> = {
        ...STORAGE_VERSION_TYPES,
        compactionThresholds: undefined,
      };
      const tracker = new VersionTracker(versionTypes);

      const now = Date.now();
      const oldTimestamp = now - 30 * 24 * 60 * 60 * 1000;

      const fullVersions: IVersions<IStorage> = {
        subscription: {
          apple: {
            items: {},
            deleted: {
              "old-receipt": oldTimestamp,
            },
          },
        },
      };

      const versionDiff: IVersions<IStorage> = {
        subscription: {
          apple: {
            items: {},
            deleted: {},
          },
        },
      };

      const merged = tracker.mergeVersions(fullVersions, versionDiff);
      const appleDeleted = (merged.subscription as any).apple.deleted;

      expect(appleDeleted["old-receipt"]).to.equal(oldTimestamp);
    });

    it("should handle merging new tombstones during compaction", () => {
      const versionTypes: IVersionTypes<IAtomicType, IControlledType> = {
        ...STORAGE_VERSION_TYPES,
        compactionThresholds: {
          "subscription.google": 14 * 24 * 60 * 60 * 1000,
        },
      };
      const tracker = new VersionTracker(versionTypes);

      const now = Date.now();
      const oldTimestamp = now - 20 * 24 * 60 * 60 * 1000;
      const newTimestamp = now - 2 * 24 * 60 * 60 * 1000;

      const fullVersions: IVersions<IStorage> = {
        subscription: {
          google: {
            items: {},
            deleted: {
              "old-receipt": oldTimestamp,
            },
          },
        },
      };

      const versionDiff: IVersions<IStorage> = {
        subscription: {
          google: {
            items: {},
            deleted: {
              "new-receipt": newTimestamp,
            },
          },
        },
      };

      const merged = tracker.mergeVersions(fullVersions, versionDiff);
      const googleDeleted = (merged.subscription as any).google.deleted;

      expect(googleDeleted["old-receipt"]).to.be.undefined;
      expect(googleDeleted["new-receipt"]).to.equal(newTimestamp);
    });

    it("should compact old tombstones during updateVersions when field changes", () => {
      const versionTypes: IVersionTypes<IAtomicType, IControlledType> = {
        ...STORAGE_VERSION_TYPES,
        compactionThresholds: {
          "subscription.apple": 14 * 24 * 60 * 60 * 1000, // 14 days
        },
      };
      const tracker = new VersionTracker(versionTypes);

      const now = Date.now();
      const oldTimestamp = now - 20 * 24 * 60 * 60 * 1000; // 20 days ago
      const recentTimestamp = now - 5 * 24 * 60 * 60 * 1000; // 5 days ago

      // Simulate existing versions with old and recent tombstones
      const currentVersions: IVersions<IStorage> = {
        subscription: {
          apple: {
            items: {},
            deleted: {
              "old-receipt": oldTimestamp,
              "recent-receipt": recentTimestamp,
            },
          },
        },
      };

      const receipt: ISubscriptionReceipt = {
        vtype: "subscription_receipt",
        id: "new-receipt",
        value: "new-receipt-data",
        createdAt: now,
      };

      const oldStorage = Storage.getDefault();
      const newStorage = {
        ...Storage.getDefault(),
        subscription: {
          ...Storage.getDefault().subscription,
          apple: [receipt], // Add a new receipt to trigger field update
        },
      };

      // Update versions with a change that affects the subscription field
      const updatedVersions = tracker.updateVersions(oldStorage, newStorage, currentVersions, {}, now);
      const appleDeleted = (updatedVersions.subscription as any)?.apple?.deleted;

      // Old tombstone should be removed during update
      expect(appleDeleted["old-receipt"]).to.be.undefined;
      // Recent tombstone should be kept
      expect(appleDeleted["recent-receipt"]).to.equal(recentTimestamp);
    });

    it("should compact tombstones when items are deleted", () => {
      const versionTypes: IVersionTypes<IAtomicType, IControlledType> = {
        ...STORAGE_VERSION_TYPES,
        compactionThresholds: {
          "subscription.google": 14 * 24 * 60 * 60 * 1000, // 14 days
        },
      };
      const tracker = new VersionTracker(versionTypes);

      const now = Date.now();
      const oldTimestamp = now - 20 * 24 * 60 * 60 * 1000; // 20 days ago

      // Current versions with an old tombstone
      const currentVersions: IVersions<IStorage> = {
        subscription: {
          google: {
            items: {
              "current-receipt": now - 1 * 24 * 60 * 60 * 1000,
            },
            deleted: {
              "old-receipt": oldTimestamp,
            },
          },
        },
      };

      const receipt: ISubscriptionReceipt = {
        vtype: "subscription_receipt",
        id: "current-receipt",
        value: "receipt-data",
        createdAt: now,
      };

      const oldStorage = {
        ...Storage.getDefault(),
        subscription: {
          ...Storage.getDefault().subscription,
          google: [receipt],
        },
      };

      const newStorage = {
        ...Storage.getDefault(),
        subscription: {
          ...Storage.getDefault().subscription,
          google: [], // Deleted the receipt
        },
      };

      const updatedVersions = tracker.updateVersions(oldStorage, newStorage, currentVersions, {}, now);
      const googleDeleted = (updatedVersions.subscription as any)?.google?.deleted;

      // Old tombstone should be removed
      expect(googleDeleted["old-receipt"]).to.be.undefined;
      // New deletion should be tracked
      expect(googleDeleted["current-receipt"]).to.equal(now);
    });
  });

  describe("controlled type ID conflict resolution", () => {
    it("should generate ID version for controlled types in updateVersions", () => {
      const tracker = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "device1" });
      const oldStorage = Storage.getDefault();
      const newStorage = {
        ...oldStorage,
        progress: [
          {
            vtype: "progress" as const,
            startTime: 1000,
            entries: [],
            date: "2024-01-01",
            programId: "program1",
            programName: "Test Program",
            day: 1,
            dayName: "Day 1",
            id: 1,
          },
        ],
      };

      const versions = tracker.updateVersions(oldStorage, newStorage, {}, {}, 2000);

      // Check that startTime (ID field) has an ID version with value
      // progress is now a collection, so versions are in items[id]
      const progressVersions = versions.progress as ICollectionVersions;
      expect(progressVersions).to.not.be.undefined;
      expect(progressVersions.items).to.not.be.undefined;
      const itemVersions = progressVersions.items!["1000"] as IVersionsObject;
      expect(itemVersions).to.not.be.undefined;
      expect(itemVersions.startTime).to.be.an("object");
      expect((itemVersions.startTime as any).value).to.equal("1000");
      expect((itemVersions.startTime as any).vc).to.deep.equal({ device1: 1 });
    });

    it("should fill ID version for controlled types in fillVersions", () => {
      const tracker = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "device1" });
      const storage = {
        ...Storage.getDefault(),
        progress: {
          vtype: "progress" as const,
          startTime: 1000,
          entries: [],
          date: "2024-01-01",
          programId: "program1",
          programName: "Test Program",
          day: 1,
          dayName: "Day 1",
          id: 1,
        },
      };

      const versions = tracker.fillVersions(storage, {}, 2000);

      // Check that startTime (ID field) has an ID version with value
      const progressVersions = versions.progress as IVersionsObject;
      expect(progressVersions).to.not.be.undefined;
      expect(progressVersions.startTime).to.be.an("object");
      expect((progressVersions.startTime as any).value).to.equal("1000");
    });

    it("should pick newer ID version in mergeVersions when IDs differ", () => {
      const tracker = new VersionTracker(STORAGE_VERSION_TYPES);

      // Device A has progress with startTime=1000, created at t=1500
      const deviceAVersions = {
        progress: {
          startTime: { vc: {}, t: 1500, value: "1000" },
          entries: { items: {} },
        },
      } as any;

      // Device B has progress with startTime=2000, created at t=2500 (newer)
      const deviceBVersions = {
        progress: {
          startTime: { vc: {}, t: 2500, value: "2000" },
          entries: { items: {} },
        },
      } as any;

      // Merge B into A - B should win because it's newer
      const merged = tracker.mergeVersions(deviceAVersions, deviceBVersions) as any;
      const progressVersions = merged.progress as IVersionsObject;

      expect((progressVersions.startTime as any).value).to.equal("2000");
      expect((progressVersions.startTime as any).t).to.equal(2500);
    });

    it("should keep older ID version in mergeVersions when diff is older", () => {
      const tracker = new VersionTracker(STORAGE_VERSION_TYPES);

      // Device A has progress with startTime=1000, created at t=2500 (newer)
      const deviceAVersions = {
        progress: {
          startTime: { vc: {}, t: 2500, value: "1000" },
          entries: { items: {} },
        },
      } as any;

      // Device B has progress with startTime=2000, created at t=1500 (older)
      const deviceBVersions = {
        progress: {
          startTime: { vc: {}, t: 1500, value: "2000" },
          entries: { items: {} },
        },
      } as any;

      // Merge B into A - A should win because it's newer
      const merged = tracker.mergeVersions(deviceAVersions, deviceBVersions) as any;
      const progressVersions = merged.progress as IVersionsObject;

      expect((progressVersions.startTime as any).value).to.equal("1000");
      expect((progressVersions.startTime as any).t).to.equal(2500);
    });

    it("should discard losing variant in mergeByVersions when IDs differ", () => {
      const tracker = new VersionTracker(STORAGE_VERSION_TYPES);

      // Full object (Device A's progress)
      const fullObj = {
        ...Storage.getDefault(),
        progress: {
          vtype: "progress" as const,
          startTime: 1000,
          entries: [{ id: "entry-a", vtype: "history_entry" as const }],
          date: "2024-01-01",
          programId: "program1",
          programName: "Test Program",
          day: 1,
          dayName: "Day 1",
          id: 1,
        },
      };

      // Full versions (after mergeVersions - A wins because t=2500 > t=1500)
      const fullVersions = {
        progress: {
          startTime: { vc: {}, t: 2500, value: "1000" },
          entries: { items: { "entry-a": { vc: {}, t: 2500 } } },
        },
      } as any;

      // Diff versions from B
      const diffVersions = {
        progress: {
          startTime: { vc: {}, t: 1500, value: "2000" },
          entries: { items: { "entry-b": { vc: {}, t: 1500 } } },
        },
      } as any;

      // Extracted object from B
      const extractedObj = {
        progress: {
          vtype: "progress" as const,
          startTime: 2000,
          entries: [{ id: "entry-b", vtype: "history_entry" as const }],
          date: "2024-01-02",
          programId: "program2",
          programName: "Another Program",
          day: 2,
          dayName: "Day 2",
          id: 2,
        },
      };

      // Merge - since A's ID won, B's progress should be discarded
      const merged = tracker.mergeByVersions(fullObj, fullVersions, diffVersions, extractedObj);

      // A's progress should be preserved, B's entries should NOT be merged
      expect(merged.progress.startTime).to.equal(1000);
      expect(merged.progress.entries).to.have.lengthOf(1);
      expect((merged.progress.entries[0] as any).id).to.equal("entry-a");
    });

    it("should accept winning variant in mergeByVersions when diff ID wins", () => {
      const tracker = new VersionTracker(STORAGE_VERSION_TYPES);

      // Full object (Device A's progress)
      const fullObj = {
        ...Storage.getDefault(),
        progress: {
          vtype: "progress" as const,
          startTime: 1000,
          entries: [{ id: "entry-a", vtype: "history_entry" as const }],
          date: "2024-01-01",
          programId: "program1",
          programName: "Test Program",
          day: 1,
          dayName: "Day 1",
          id: 1,
        },
      };

      // Full versions (Device A's local versions - has A's ID with older timestamp)
      const fullVersions = {
        progress: {
          startTime: { vc: {}, t: 1500, value: "1000" },
          entries: { items: { "entry-a": { vc: {}, t: 1500 } } },
        },
      } as any;

      // Diff versions from B (has B's ID with newer timestamp - B wins)
      const diffVersions = {
        progress: {
          startTime: { vc: {}, t: 2500, value: "2000" },
          entries: { items: { "entry-b": { vc: {}, t: 2500 } } },
        },
      } as any;

      // Extracted object from B (full object, not just diff)
      const extractedObj = {
        progress: {
          vtype: "progress" as const,
          startTime: 2000,
          entries: [{ id: "entry-b", vtype: "history_entry" as const }],
          date: "2024-01-02",
          programId: "program2",
          programName: "Another Program",
          day: 2,
          dayName: "Day 2",
          id: 2,
        },
      };

      // Merge - since B's ID won (t=2500 > t=1500), B's progress should be accepted entirely
      const merged = tracker.mergeByVersions(fullObj, fullVersions, diffVersions, extractedObj);

      // B's progress should be used entirely
      expect(merged.progress.startTime).to.equal(2000);
      expect(merged.progress.programName).to.equal("Another Program");
    });

    it("should merge controlled fields normally when IDs match", () => {
      const tracker = new VersionTracker(STORAGE_VERSION_TYPES);

      // Valid entry structure with required fields
      const validEntryA: IHistoryEntry = {
        id: "entry-a",
        vtype: "history_entry",
        exercise: { id: "squat" },
        sets: [{ vtype: "set", index: 0, reps: 5, weight: { value: 100, unit: "kg" }, id: UidFactory.generateUid(6) }],
        warmupSets: [],
        index: 0,
      };

      const validEntryB: IHistoryEntry = {
        id: "entry-b",
        vtype: "history_entry",
        exercise: { id: "benchPress" },
        sets: [{ vtype: "set", index: 0, reps: 8, weight: { value: 60, unit: "kg" }, id: UidFactory.generateUid(6) }],
        warmupSets: [],
        index: 1,
      };

      // Full object (Device A's progress) - now an array
      const fullObj = {
        ...Storage.getDefault(),
        progress: [
          {
            vtype: "progress" as const,
            startTime: 1000,
            entries: [validEntryA],
            date: "2024-01-01",
            programId: "program1",
            programName: "Test Program",
            day: 1,
            dayName: "Day 1",
            id: 1,
            notes: "Note A",
          },
        ],
      };

      // Full versions - now collection structure with items
      const fullVersions = {
        progress: {
          items: {
            "1000": {
              startTime: { vc: {}, t: 1500, value: "1000" },
              entries: { items: { "entry-a": { vc: {}, t: 1500 } } },
              notes: { vc: {}, t: 1500 },
            },
          },
          deleted: {},
        },
      } as any;

      // Diff versions - same startTime but newer notes
      const diffVersions = {
        progress: {
          items: {
            "1000": {
              startTime: { vc: {}, t: 1500, value: "1000" },
              entries: { items: { "entry-b": { vc: {}, t: 2500 } } },
              notes: { vc: {}, t: 2500 },
            },
          },
          deleted: {},
        },
      } as any;

      // Extracted object - now an array
      const extractedObj = {
        progress: [
          {
            vtype: "progress" as const,
            startTime: 1000,
            entries: [validEntryB],
            date: "2024-01-01",
            programId: "program1",
            programName: "Test Program",
            day: 1,
            dayName: "Day 1",
            id: 1,
            notes: "Note B",
          },
        ],
      };

      // Merge - since IDs match, fields should be merged
      const merged = tracker.mergeByVersions(fullObj, fullVersions, diffVersions, extractedObj);

      // ID stays the same
      expect(merged.progress[0].startTime).to.equal(1000);
      // Notes from B wins (newer)
      expect(merged.progress[0].notes).to.equal("Note B");
      // Entries from both should be present
      expect(merged.progress[0].entries).to.have.lengthOf(2);
    });
  });

  describe("phone-watch set sync (empty sets → collection version transition)", () => {
    it("should preserve phone's newly added set when watch sends back old storage without it", () => {
      const phoneTracker = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "ios_phone" });
      const watchTracker = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "watch_abc" });

      const entry: IHistoryEntry = {
        id: "entry1",
        vtype: "history_entry",
        exercise: { id: "squat" },
        sets: [],
        warmupSets: [],
        index: 0,
      };

      // 1. Phone creates progress with an entry that has empty sets
      const storageBase = Storage.getDefault();
      const storageWithProgress = {
        ...storageBase,
        progress: [
          {
            vtype: "progress" as const,
            startTime: 5000,
            entries: [entry],
            date: "2024-01-01",
            programId: "prog1",
            programName: "Test",
            day: 1,
            dayName: "Day 1",
            id: 1,
          },
        ],
      };
      const phoneVersions1 = phoneTracker.updateVersions(storageBase, storageWithProgress, {}, {}, 1000);

      // 2. Watch receives the phone's storage (entry with 0 sets) and creates its own versions
      const watchStorage1 = ObjectUtils.clone(storageWithProgress);
      const watchVersions1 = watchTracker.fillVersions(watchStorage1, phoneVersions1, 1000);

      // 3. Phone adds a set to the entry
      const setToAdd = {
        vtype: "set" as const,
        index: 0,
        id: "new-set-1",
        isAmrap: false,
        isUnilateral: false,
        askWeight: false,
        isCompleted: false,
      };
      const storageWithSet = {
        ...storageWithProgress,
        progress: [
          {
            ...storageWithProgress.progress[0],
            entries: [{ ...entry, sets: [setToAdd] }],
          },
        ],
      };
      const phoneVersions2 = phoneTracker.updateVersions(storageWithProgress, storageWithSet, phoneVersions1, {}, 2000);

      // Verify phone now has a collection version for sets (not a field version)
      const progressVersions = phoneVersions2.progress as ICollectionVersions;
      const progressItemVersions = progressVersions.items!["5000"] as IVersionsObject;
      const entriesVersions = progressItemVersions.entries as ICollectionVersions;
      const entryVersions = entriesVersions.items!["entry1"] as IVersionsObject;
      expect(entryVersions.sets).to.have.property("items");

      // 4. Watch sends back its OLD storage (without the set) to the phone
      //    This simulates the watch sending before receiving the phone's updated storage
      const phoneStorage = { ...storageWithSet, _versions: phoneVersions2 } as any;
      const watchStorageToSend = { ...watchStorage1, _versions: watchVersions1 } as any;
      const merged = Storage.mergeStorage(phoneStorage, watchStorageToSend, "ios_phone");

      // Phone's set must be preserved
      expect(merged.progress[0].entries[0].sets).to.have.lengthOf(1);
      expect(merged.progress[0].entries[0].sets[0].id).to.equal("new-set-1");
    });

    it("should not oscillate when phone and watch repeatedly merge", () => {
      const phoneTracker = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "ios_phone" });

      const entry: IHistoryEntry = {
        id: "entry1",
        vtype: "history_entry",
        exercise: { id: "squat" },
        sets: [],
        warmupSets: [],
        index: 0,
      };

      // 1. Phone creates progress with empty sets
      const storageBase = Storage.getDefault();
      const storageWithProgress = {
        ...storageBase,
        progress: [
          {
            vtype: "progress" as const,
            startTime: 5000,
            entries: [entry],
            date: "2024-01-01",
            programId: "prog1",
            programName: "Test",
            day: 1,
            dayName: "Day 1",
            id: 1,
          },
        ],
      };
      const phoneVersions1 = phoneTracker.updateVersions(storageBase, storageWithProgress, {}, {}, 1000);

      // 2. Watch gets phone's storage
      const watchStorage = ObjectUtils.clone(storageWithProgress) as any;
      watchStorage._versions = ObjectUtils.clone(phoneVersions1);

      // 3. Phone adds a set
      const setToAdd = {
        vtype: "set" as const,
        index: 0,
        id: "new-set-1",
        isAmrap: false,
        isUnilateral: false,
        askWeight: false,
        isCompleted: false,
      };
      const storageWithSet = {
        ...storageWithProgress,
        progress: [
          {
            ...storageWithProgress.progress[0],
            entries: [{ ...entry, sets: [setToAdd] }],
          },
        ],
      };
      const phoneVersions2 = phoneTracker.updateVersions(storageWithProgress, storageWithSet, phoneVersions1, {}, 2000);

      // 4. Simulate multiple round-trips: phone merges watch, then watch merges phone, etc.
      let phoneState: any = { ...storageWithSet, _versions: phoneVersions2 };
      let watchState: any = { ...watchStorage, _versions: watchStorage._versions };

      for (let i = 0; i < 5; i++) {
        // Phone merges watch's storage
        const phoneMerged = Storage.mergeStorage(phoneState, watchState, "ios_phone");
        phoneState = phoneMerged;

        // Watch merges phone's storage
        const watchMerged = Storage.mergeStorage(watchState, phoneState, "watch_abc");
        watchState = watchMerged;
      }

      // After all round-trips, phone should still have the set
      expect(phoneState.progress[0].entries[0].sets).to.have.lengthOf(1);
      expect(phoneState.progress[0].entries[0].sets[0].id).to.equal("new-set-1");

      // Watch should also have the set now
      expect(watchState.progress[0].entries[0].sets).to.have.lengthOf(1);
      expect(watchState.progress[0].entries[0].sets[0].id).to.equal("new-set-1");
    });
  });
});
