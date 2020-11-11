import { IProgram } from "../../../src/models/program";
import { CollectionUtils } from "../../../src/utils/collection";
import { CloudflareWorkerKV } from "types-cloudflare-worker";

declare let kv_liftosaur_programs: CloudflareWorkerKV;

interface IProgramPayload {
  program: IProgram;
  id: string;
  timestamp: number;
  version: number;
}

export namespace ProgramModel {
  export async function getAll(): Promise<IProgramPayload[]> {
    const keys = (await kv_liftosaur_programs.list()).keys;
    const groups = CollectionUtils.inGroupsOf(100, keys);
    let programs: IProgramPayload[] = [];
    for (const group of groups) {
      programs = programs.concat(await Promise.all(group.map((key) => kv_liftosaur_programs.get(key.name, "json"))));
    }
    return programs;
  }

  export async function storeAll(programs: IProgram[], version: number): Promise<void> {
    const groups = CollectionUtils.inGroupsOf(100, programs);
    for (const group of groups) {
      await Promise.all(
        group.map(async (program) => {
          const payload: IProgramPayload = await kv_liftosaur_programs.get(program.id, "json");
          payload.program = program;
          payload.version = version;
          await kv_liftosaur_programs.put(program.id, JSON.stringify(payload));
        })
      );
    }
  }
}
