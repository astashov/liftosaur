import type { AnyMap } from "react-native-nitro-modules";
import {
  isHealthDataAvailableAsync,
  queryQuantitySamplesWithAnchor,
  requestAuthorization,
  saveQuantitySample,
  saveWorkoutSample,
  WorkoutActivityType,
  type MassUnit,
  type LengthUnit,
  type ObjectTypeIdentifier,
  type QuantityTypeIdentifierWriteable,
  type SampleTypeIdentifierWriteable,
  type MetadataForQuantityIdentifier,
  type QuantitySampleForSaving,
} from "@kingstinct/react-native-healthkit";
import {
  IHealthAdapter,
  IHealthMeasurement,
  IHealthMeasurementsPayload,
  IHealthSyncArgs,
  IHealthSyncResult,
  IHealthWorkoutPayload,
} from "./healthAdapter";
import { ILength, ILengthUnit, IPercentage, IUnit, IWeight } from "../types";
import { HealthIosAnchors_decode, HealthIosAnchors_encode, IHealthIosAnchors } from "./healthIosAnchors";

const BODY_MASS = "HKQuantityTypeIdentifierBodyMass" satisfies QuantityTypeIdentifierWriteable;
const BODY_FAT = "HKQuantityTypeIdentifierBodyFatPercentage" satisfies QuantityTypeIdentifierWriteable;
const WAIST = "HKQuantityTypeIdentifierWaistCircumference" satisfies QuantityTypeIdentifierWriteable;
const ENERGY_BURNED = "HKQuantityTypeIdentifierActiveEnergyBurned" satisfies QuantityTypeIdentifierWriteable;
const WORKOUT = "HKWorkoutTypeIdentifier" satisfies SampleTypeIdentifierWriteable;

// Active energy is only read by the watchOS app and the native phone workout-mirroring path, each of
// which requests its own authorization. Keeping it out of the RN read request avoids a recurring
// "Active Energy" read prompt on every app start for users who only sync measurements.
const MEASUREMENT_READ_TYPES: ObjectTypeIdentifier[] = [BODY_MASS, BODY_FAT, WAIST];
const MEASUREMENT_WRITE_TYPES: SampleTypeIdentifierWriteable[] = [BODY_MASS, BODY_FAT, WAIST];
const WORKOUT_WRITE_TYPES: SampleTypeIdentifierWriteable[] = [WORKOUT, ENERGY_BURNED];
const ALL_WRITE_TYPES: SampleTypeIdentifierWriteable[] = [...MEASUREMENT_WRITE_TYPES, ...WORKOUT_WRITE_TYPES];

const LIFTOSAUR_META = { liftosaur: true } as AnyMap;

function massUnitArg(unit: IUnit): MassUnit {
  return unit === "kg" ? "kg" : "lb";
}

function lengthUnitArg(unit: ILengthUnit): LengthUnit {
  return unit === "cm" ? "cm" : "in";
}

function clampWorkoutEnd(startMs: number, endMs: number): number {
  const maxEnd = startMs + 3 * 24 * 60 * 60 * 1000;
  return Math.min(Math.max(endMs, startMs), maxEnd);
}

function metaFor<T extends QuantityTypeIdentifierWriteable>(): MetadataForQuantityIdentifier<T> {
  return LIFTOSAUR_META as MetadataForQuantityIdentifier<T>;
}

export class HealthAdapter implements IHealthAdapter {
  private askedReadThisSession = false;

  public async isAvailable(): Promise<boolean> {
    return isHealthDataAvailableAsync();
  }

  public async requestPermissions(): Promise<boolean> {
    return requestAuthorization({ toRead: MEASUREMENT_READ_TYPES, toShare: ALL_WRITE_TYPES });
  }

  public async syncMeasurements(args: IHealthSyncArgs): Promise<IHealthSyncResult> {
    if (!this.askedReadThisSession) {
      this.askedReadThisSession = true;
      await requestAuthorization({ toRead: MEASUREMENT_READ_TYPES, toShare: [] });
    }
    const prior = HealthIosAnchors_decode(args.anchor);
    try {
      return await this.querySamples(args, prior);
    } catch (e) {
      if (args.anchor) {
        return this.querySamples(args, { bodyMass: undefined, bodyFat: undefined, waist: undefined });
      }
      throw e;
    }
  }

  public async saveWorkout(args: IHealthWorkoutPayload): Promise<void> {
    const start = new Date(args.startMs);
    const end = new Date(clampWorkoutEnd(args.startMs, args.endMs));
    if (start > end) {
      return;
    }
    const calories = Math.max(0, args.calories);
    const quantities: QuantitySampleForSaving[] =
      calories > 0
        ? [
            {
              quantityType: ENERGY_BURNED,
              quantity: calories,
              unit: "kcal",
              startDate: start,
              endDate: end,
              metadata: LIFTOSAUR_META,
            },
          ]
        : [];
    const totals = calories > 0 ? { energyBurned: calories } : undefined;
    try {
      await saveWorkoutSample(
        WorkoutActivityType.traditionalStrengthTraining,
        quantities,
        start,
        end,
        totals,
        LIFTOSAUR_META
      );
    } catch {
      await requestAuthorization({ toRead: [], toShare: WORKOUT_WRITE_TYPES });
      await saveWorkoutSample(
        WorkoutActivityType.traditionalStrengthTraining,
        quantities,
        start,
        end,
        totals,
        LIFTOSAUR_META
      );
    }
  }

  public async saveMeasurements(args: IHealthMeasurementsPayload): Promise<void> {
    const date = new Date(args.timestamp);
    const taskFns: (() => Promise<unknown>)[] = [];
    const neededTypes: SampleTypeIdentifierWriteable[] = [];
    if (args.bodyweight) {
      const bw = args.bodyweight;
      neededTypes.push(BODY_MASS);
      taskFns.push(() =>
        saveQuantitySample(BODY_MASS, massUnitArg(bw.unit as IUnit), bw.value, date, date, metaFor<typeof BODY_MASS>())
      );
    }
    if (args.bodyfat) {
      const bf = args.bodyfat;
      neededTypes.push(BODY_FAT);
      taskFns.push(() => saveQuantitySample(BODY_FAT, "%", bf.value / 100, date, date, metaFor<typeof BODY_FAT>()));
    }
    if (args.waist) {
      const w = args.waist;
      neededTypes.push(WAIST);
      taskFns.push(() =>
        saveQuantitySample(WAIST, lengthUnitArg(w.unit as ILengthUnit), w.value, date, date, metaFor<typeof WAIST>())
      );
    }
    if (taskFns.length === 0) {
      return;
    }
    try {
      // Run the first save alone so HealthKit builds its HKUnit grammar serially - the first-time
      // build isn't thread-safe and concurrent parses raise an NSException that aborts the app.
      const [first, ...rest] = taskFns;
      await first();
      await Promise.all(rest.map((fn) => fn()));
    } catch {
      await requestAuthorization({ toRead: [], toShare: neededTypes });
      await Promise.all(taskFns.map((fn) => fn()));
    }
  }

  private async querySamples(args: IHealthSyncArgs, prior: IHealthIosAnchors): Promise<IHealthSyncResult> {
    const weightUnitParam = massUnitArg(args.weightUnit);
    const lengthUnitParam = lengthUnitArg(args.lengthUnit);

    // HealthKit builds its HKUnit parsing grammar lazily on the first unitFromString: call, and
    // that first build is not thread-safe - concurrent first-time parses race and raise an
    // NSException that aborts the app. Run the first query alone so the grammar is built serially.
    const bodyMassRes = await queryQuantitySamplesWithAnchor(BODY_MASS, {
      anchor: prior.bodyMass,
      unit: weightUnitParam,
      limit: 0,
    });
    const [bodyFatRes, waistRes] = await Promise.all([
      queryQuantitySamplesWithAnchor(BODY_FAT, { anchor: prior.bodyFat, unit: "%", limit: 0 }),
      queryQuantitySamplesWithAnchor(WAIST, { anchor: prior.waist, unit: lengthUnitParam, limit: 0 }),
    ]);

    const added: IHealthMeasurement[] = [];
    for (const sample of bodyMassRes.samples) {
      const m = this.toMeasurement(
        { metadata: sample.metadata, quantity: sample.quantity, startDate: sample.startDate, uuid: sample.uuid },
        "bodyweight",
        args.weightUnit,
        args.lengthUnit,
        !prior.bodyMass
      );
      if (m) {
        added.push(m);
      }
    }
    for (const sample of bodyFatRes.samples) {
      const m = this.toMeasurement(
        { metadata: sample.metadata, quantity: sample.quantity, startDate: sample.startDate, uuid: sample.uuid },
        "bodyfat",
        args.weightUnit,
        args.lengthUnit,
        !prior.bodyFat
      );
      if (m) {
        added.push(m);
      }
    }
    for (const sample of waistRes.samples) {
      const m = this.toMeasurement(
        { metadata: sample.metadata, quantity: sample.quantity, startDate: sample.startDate, uuid: sample.uuid },
        "waist",
        args.weightUnit,
        args.lengthUnit,
        !prior.waist
      );
      if (m) {
        added.push(m);
      }
    }

    const deleted = [...bodyMassRes.deletedSamples, ...bodyFatRes.deletedSamples, ...waistRes.deletedSamples].map(
      (d) => d.uuid
    );

    const next: IHealthIosAnchors = {
      bodyMass: bodyMassRes.newAnchor || prior.bodyMass,
      bodyFat: bodyFatRes.newAnchor || prior.bodyFat,
      waist: waistRes.newAnchor || prior.waist,
    };

    return { added, deleted, anchor: HealthIosAnchors_encode(next) };
  }

  private toMeasurement(
    sample: { metadata: AnyMap; quantity: number; startDate: Date; uuid: string },
    type: "bodyweight" | "bodyfat" | "waist",
    weightUnit: IUnit,
    lengthUnitVal: ILengthUnit,
    includeLiftosaurAuthored: boolean
  ): IHealthMeasurement | undefined {
    const meta = sample.metadata as Record<string, unknown> | undefined;
    const lft = meta?.liftosaur;
    const isLiftosaur = lft === true || lft === 1 || lft === "1" || lft === "true";
    if (isLiftosaur && !includeLiftosaurAuthored) {
      return undefined;
    }
    const timestamp = new Date(sample.startDate).getTime();
    let value: IWeight | IPercentage | ILength;
    if (type === "bodyweight") {
      value = { value: sample.quantity, unit: weightUnit } as IWeight;
    } else if (type === "bodyfat") {
      value = { value: sample.quantity * 100, unit: "%" } as IPercentage;
    } else {
      value = { value: sample.quantity, unit: lengthUnitVal } as ILength;
    }
    return { timestamp, type, uuid: sample.uuid, value };
  }
}
