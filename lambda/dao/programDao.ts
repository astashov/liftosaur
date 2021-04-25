import { IProgram } from "../../src/types";
import { Utils } from "../utils";
import { IDI } from "../utils/di";

const tableNames = {
  dev: {
    programs: "lftProgramsDev",
  },
  prod: {
    programs: "lftPrograms",
  },
} as const;

interface IProgramPayload {
  program: IProgram;
  id: string;
  ts: number;
  version: number;
}

export class ProgramDao {
  constructor(private readonly di: IDI) {}

  public async getAll(): Promise<IProgramPayload[]> {
    const env = Utils.getEnv();
    return this.di.dynamo.scan({ tableName: tableNames[env].programs });
  }

  public async save(program: IProgram, timestamp?: number): Promise<void> {
    const env = Utils.getEnv();

    await this.di.dynamo.update({
      tableName: tableNames[env].programs,
      key: { id: program.id },
      expression: "SET ts = :ts, program = :program",
      values: { ":ts": timestamp || Date.now(), ":program": program },
    });
  }

  public async add(programPayload: IProgramPayload): Promise<void> {
    const env = Utils.getEnv();
    programPayload.id = programPayload.program.id;
    await this.di.dynamo.put({ tableName: tableNames[env].programs, item: programPayload });
  }
}
