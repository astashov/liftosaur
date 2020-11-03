import json from "../exes.json";
import fs from "fs";
import { ObjectUtils } from "./utils/object";

async function main(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exes: Partial<Record<string, Partial<Record<string, any>>>> = json as any;
  const ids: string[] = [];
  const bodyParts = new Set();
  const muscles = new Set();
  for (const exerciseId of ObjectUtils.keys(exes)) {
    const equipments = exes[exerciseId]!;
    for (const equipment of ObjectUtils.keys(equipments)) {
      const e = equipments[equipment]!;
      delete e.pageUrl;
      delete e.imageUrl;
      delete e.id;
      const bps = e.bodyPart.split(",").map((b: any) => b.trim());
      for (const bp of bps) {
        bodyParts.add(bp);
      }
      e.bodyParts = bps;
      delete e.bodyPart;
    }
  }
  console.log(JSON.stringify(exes, null, 2));
}

main();
