import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, ScanCommandOutput } from "@aws-sdk/lib-dynamodb";
import * as fs from "fs";
import { userTableNames } from "../lambda/dao/userDao";
import { Utils_getEnv } from "../lambda/utils";
import { Settings_build } from "../src/models/settings";
import { Weight_calculatePlates, Weight_convertTo, Weight_decrement, Weight_increment } from "../src/models/weight";
import { IEquipmentData, IExerciseType, IGym, ISettings, IUnit, IWeight } from "../src/types";
import { LegacyPlates_calculate, LegacyPlates_decrement, LegacyPlates_increment } from "../test/legacyPlates";

interface IConfig {
  data: IEquipmentData;
  bodyweight?: IWeight;
  users: Set<string>;
  example: string;
}

interface IMismatch {
  kind: "round" | "increment" | "decrement" | "error";
  unit: IUnit;
  isCrossUnit: boolean;
  target: number;
  legacy?: number;
  next?: number;
  error?: string;
  reason?: "negative or zero" | "old not loadable" | "old skipped a weight";
}

interface IConfigResult {
  key: string;
  users: number;
  example: string;
  summary: string;
  mismatches: IMismatch[];
}

const PARITY_KEY = "parity";
const EXERCISE: IExerciseType = { id: "squat", equipment: PARITY_KEY };
const LIMIT_USERS = process.env.LIMIT_USERS ? parseInt(process.env.LIMIT_USERS, 10) : Infinity;
const OUT = process.env.OUT ?? "equipment_parity.json";

function targetsFor(unit: IUnit): number[] {
  const step = unit === "lb" ? 5 : 2.5;
  const max = unit === "lb" ? 500 : 230;
  const values: number[] = [];
  for (let value = -60; value <= max; value += step) {
    values.push(value);
  }
  const odd = unit === "lb" ? [1, 2.5, 57.3, 133, 137, 138.75, 1000] : [1, 1.25, 26.4, 61, 63, 101.3, 500];
  return [...values, ...odd];
}

function computationalKey(data: IEquipmentData, bodyweight: IWeight | undefined): string {
  return JSON.stringify([
    data.bar,
    data.plates,
    data.fixed,
    data.isFixed,
    data.multiplier,
    !!data.useBodyweightForBar,
    !!data.isAssisting,
    data.unit ?? null,
    data.useBodyweightForBar ? (bodyweight ?? null) : null,
  ]);
}

function summaryOf(data: IEquipmentData): string {
  const plates = data.plates.map((p) => `${p.weight.value}${p.weight.unit}×${p.num}`).join(",");
  const fixed = data.fixed.map((f) => `${f.value}${f.unit}`).join(",");
  return [
    data.isFixed ? `fixed[${fixed}]` : `bar ${data.bar.lb.value}lb/${data.bar.kg.value}kg plates[${plates}]`,
    `×${data.multiplier}`,
    data.unit ? `unit ${data.unit}` : undefined,
    data.useBodyweightForBar ? "bodyweight" : undefined,
    data.isAssisting ? "assisting" : undefined,
  ]
    .filter((p) => p != null)
    .join(" · ");
}

async function collectConfigs(): Promise<{ configs: Map<string, IConfig>; userCount: number }> {
  const env = Utils_getEnv();
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const configs = new Map<string, IConfig>();
  let userCount = 0;
  let lastKey: ScanCommandOutput["LastEvaluatedKey"] = undefined;
  do {
    const page: ScanCommandOutput = await client.send(
      new ScanCommand({
        TableName: userTableNames[env].users,
        ExclusiveStartKey: lastKey,
        ProjectionExpression: "#id, #storage.#settings.#gyms, #storage.#settings.#currentBodyweight",
        ExpressionAttributeNames: {
          "#id": "id",
          "#storage": "storage",
          "#settings": "settings",
          "#gyms": "gyms",
          "#currentBodyweight": "currentBodyweight",
        },
      })
    );
    for (const item of page.Items ?? []) {
      userCount += 1;
      const userId: string = item.id;
      const gyms: IGym[] = item.storage?.settings?.gyms ?? [];
      const bodyweight: IWeight | undefined = item.storage?.settings?.currentBodyweight;
      for (const gym of gyms) {
        for (const [equipmentKey, data] of Object.entries(gym.equipment ?? {})) {
          if (data == null || data.bar == null || data.plates == null || data.fixed == null) {
            continue;
          }
          const key = computationalKey(data, bodyweight);
          const config = configs.get(key) ?? {
            data,
            bodyweight: data.useBodyweightForBar ? bodyweight : undefined,
            users: new Set<string>(),
            example: `${userId} ${gym.id} ${equipmentKey}`,
          };
          config.users.add(userId);
          configs.set(key, config);
        }
      }
      if (userCount >= LIMIT_USERS) {
        return { configs, userCount };
      }
    }
    lastKey = page.LastEvaluatedKey;
    console.log(`  scanned ${userCount} users, ${configs.size} distinct equipment setups`);
  } while (lastKey != null);
  return { configs, userCount };
}

function settingsFor(config: IConfig): ISettings {
  const settings = Settings_build();
  settings.currentBodyweight = config.bodyweight;
  const { setup, setupLegacyHash, ...legacy } = config.data;
  settings.gyms[0].equipment[PARITY_KEY] = legacy;
  return settings;
}

function isLoadable(weight: IWeight, settings: ISettings): boolean {
  return Weight_calculatePlates(weight, settings, weight.unit, EXERCISE).totalWeight.value === weight.value;
}

function steppingReason(
  kind: "increment" | "decrement",
  base: IWeight,
  oldStep: IWeight,
  newStep: IWeight,
  settings: ISettings
): IMismatch["reason"] {
  if (base.value <= 0 || oldStep.value < 0 || newStep.value < 0) {
    return "negative or zero";
  }
  if (!isLoadable(oldStep, settings)) {
    return "old not loadable";
  }
  const isBetween =
    kind === "increment"
      ? newStep.value > base.value && newStep.value < oldStep.value
      : newStep.value < base.value && newStep.value > oldStep.value;
  return isBetween && isLoadable(newStep, settings) ? "old skipped a weight" : undefined;
}

function checkConfig(config: IConfig): IMismatch[] {
  const settings = settingsFor(config);
  const mismatches: IMismatch[] = [];
  for (const unit of ["lb", "kg"] as const) {
    const isCrossUnit = config.data.unit != null && config.data.unit !== unit;
    for (const value of targetsFor(unit)) {
      const target: IWeight = { value, unit };
      try {
        const legacy = LegacyPlates_calculate(target, settings, unit, EXERCISE).totalWeight;
        const next = Weight_calculatePlates(target, settings, unit, EXERCISE).totalWeight;
        if (legacy.value !== next.value || legacy.unit !== next.unit) {
          mismatches.push({ kind: "round", unit, isCrossUnit, target: value, legacy: legacy.value, next: next.value });
          continue;
        }
        const steps = [
          {
            kind: "increment" as const,
            old: LegacyPlates_increment(legacy, settings, EXERCISE),
            new: Weight_increment(legacy, settings, EXERCISE),
          },
          {
            kind: "decrement" as const,
            old: LegacyPlates_decrement(legacy, settings, EXERCISE),
            new: Weight_decrement(legacy, settings, EXERCISE),
          },
        ];
        for (const s of steps) {
          s.old = Weight_convertTo(s.old, unit);
          if (s.old.value !== s.new.value) {
            mismatches.push({
              kind: s.kind,
              unit,
              isCrossUnit,
              target: value,
              legacy: s.old.value,
              next: s.new.value,
              reason: steppingReason(s.kind, legacy, s.old, s.new, settings),
            });
          }
        }
      } catch (e) {
        mismatches.push({ kind: "error", unit, isCrossUnit, target: value, error: (e as Error).message });
      }
    }
  }
  return mismatches;
}

function printGroup(title: string, results: IConfigResult[], filter: (m: IMismatch) => boolean): void {
  const affected = results.filter((r) => r.mismatches.some(filter));
  const users = affected.reduce((memo, r) => memo + r.users, 0);
  const checks = affected.reduce((memo, r) => memo + r.mismatches.filter(filter).length, 0);
  console.log(`\n${title}: ${affected.length} setups, ${users} users, ${checks} differing checks`);
  for (const result of [...affected].sort((a, b) => b.users - a.users).slice(0, 10)) {
    const first = result.mismatches.find(filter)!;
    const detail =
      first.kind === "error"
        ? first.error
        : `${first.kind} ${first.target}${first.unit}: old ${first.legacy}, new ${first.next}`;
    console.log(`  ${result.users} users · ${result.summary}`);
    console.log(`    ${detail} · e.g. ${result.example}`);
  }
}

function defaultConfigs(): { configs: Map<string, IConfig>; userCount: number } {
  const configs = new Map<string, IConfig>();
  for (const [equipmentKey, data] of Object.entries(Settings_build().gyms[0].equipment)) {
    if (data != null) {
      configs.set(equipmentKey, { data, users: new Set(["offline"]), example: `defaults ${equipmentKey}` });
    }
  }
  return { configs, userCount: 1 };
}

async function main(): Promise<void> {
  const isOffline = process.env.OFFLINE === "1";
  console.log(isOffline ? "Offline: default equipment only" : `Scanning ${userTableNames[Utils_getEnv()].users}...`);
  const { configs, userCount } = isOffline ? defaultConfigs() : await collectConfigs();
  console.log(`Checking ${configs.size} distinct setups from ${userCount} users...`);
  const results: IConfigResult[] = [];
  let done = 0;
  for (const [key, config] of configs) {
    results.push({
      key,
      users: config.users.size,
      example: config.example,
      summary: summaryOf(config.data),
      mismatches: checkConfig(config),
    });
    done += 1;
    if (done % 500 === 0) {
      console.log(`  checked ${done}/${configs.size}`);
    }
  }
  const differing = results.filter((r) => r.mismatches.length > 0);
  console.log(`\nUsers scanned: ${userCount}`);
  console.log(`Distinct setups: ${results.length}, with any difference: ${differing.length}`);
  const isStep = (m: IMismatch): boolean => m.kind === "increment" || m.kind === "decrement";
  printGroup("Same unit, rounding", results, (m) => !m.isCrossUnit && m.kind === "round");
  printGroup("Same unit, stepping, unexplained", results, (m) => !m.isCrossUnit && isStep(m) && m.reason == null);
  for (const reason of ["negative or zero", "old not loadable", "old skipped a weight"] as const) {
    printGroup(`Same unit, stepping, approved: ${reason}`, results, (m) => !m.isCrossUnit && m.reason === reason);
  }
  printGroup("Other unit, rounding", results, (m) => m.isCrossUnit && m.kind === "round");
  printGroup("Other unit, stepping, unexplained", results, (m) => m.isCrossUnit && isStep(m) && m.reason == null);
  printGroup("Errors", results, (m) => m.kind === "error");
  fs.writeFileSync(OUT, JSON.stringify(differing, null, 2));
  console.log(`\nWrote ${differing.length} differing setups to ${OUT}`);
}

main();
