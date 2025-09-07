import { IProgram } from "../../src/types";
import { CollectionUtils } from "../../src/utils/collection";
import { Utils } from "../utils";
import { IDI } from "../utils/di";

export const programTableNames = {
  dev: {
    programs: "lftProgramsDev",
  },
  prod: {
    programs: "lftPrograms",
  },
} as const;

export interface IProgramPayload {
  program: IProgram;
  id: string;
  ts: number;
  version: number;
}

export const programOrder = [
  "basicBeginner",
  "the5314b",
  "the531bbb",
  "monolith531",
  "nsuns",
  "pzerofullbody",
  "gzclp",
  "gzclp-blacknoir",
  "gzcl-the-rippler",
  "gzcl-jacked-and-tan-2",
  "gzcl-uhf-9-weeks",
  "gzcl-uhf-5-weeks",
  "gzcl-vdip",
  "gzcl-general-gainz",
  "gzcl-ggbb",
  "gzcl-general-gainz-burrito-but-big",
  "madcow",
  "dbPpl",
  "phul",
  "phrakgreyskull",
  "ss1",
  "ss2",
  "ss3",
  "strongcurves",
  "texasmethod",
];

export class ProgramDao {
  constructor(private readonly di: IDI) {}

  public async getAll(): Promise<IProgramPayload[]> {
    const env = Utils.getEnv();
    const programs: IProgramPayload[] = await this.di.dynamo.scan({ tableName: programTableNames[env].programs });
    return CollectionUtils.sortInOrder(programs, "id", programOrder);
  }

  public async get(id: string): Promise<IProgramPayload | undefined> {
    const env = Utils.getEnv();
    return this.di.dynamo.get({ tableName: programTableNames[env].programs, key: { id } });
  }

  public async save(program: IProgram, timestamp?: number): Promise<void> {
    const env = Utils.getEnv();

    await this.di.dynamo.update({
      tableName: programTableNames[env].programs,
      key: { id: program.id },
      expression: "SET ts = :ts, program = :program",
      values: { ":ts": timestamp || Date.now(), ":program": program },
    });
  }

  public async add(programPayload: IProgramPayload): Promise<void> {
    const env = Utils.getEnv();
    programPayload.id = programPayload.program.id;
    await this.di.dynamo.put({ tableName: programTableNames[env].programs, item: programPayload });
  }
}
