import { IProgram } from "../../src/types";
import { IProgramDetail } from "../../src/api/service";
import { IProgramIndexEntry, Program_create } from "../../src/models/program";
import { IDI } from "../utils/di";

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
  "arnoldgoldensix",
  "lylegenericbulking",
  "metallicadpappl",
];

function getCdnHost(): string {
  return process.env.HOST || "https://www.liftosaur.com";
}

function buildProgram(entry: IProgramIndexEntry, detail: IProgramDetail): IProgram {
  return {
    ...Program_create(entry.name, entry.id),
    author: entry.author,
    url: entry.url,
    shortDescription: entry.shortDescription,
    description: entry.description || "",
    isMultiweek: entry.isMultiweek,
    tags: entry.tags as IProgram["tags"],
    planner: detail.planner,
  };
}

export class ProgramDao {
  constructor(private readonly di: IDI) {}

  public async getIndex(): Promise<IProgramIndexEntry[]> {
    const response = await this.di.fetch(`${getCdnHost()}/programdata/index.json`);
    return response.json();
  }

  public async getById(id: string): Promise<{ program: IProgram; indexEntry: IProgramIndexEntry } | undefined> {
    const index = await this.getIndex();
    const entry = index.find((e) => e.id === id);
    if (!entry) {
      return undefined;
    }
    const detail = await this.getDetail(id);
    return { program: buildProgram(entry, detail), indexEntry: entry };
  }

  public async getAll(): Promise<IProgramPayload[]> {
    const index = await this.getIndex();
    const details = await Promise.all(index.map((entry) => this.getDetail(entry.id)));
    return index.map((entry, i) => ({
      id: entry.id,
      program: buildProgram(entry, details[i]),
      ts: 0,
      version: 1,
    }));
  }

  public async getDetail(id: string): Promise<IProgramDetail> {
    const response = await this.di.fetch(`${getCdnHost()}/programdata/programs/builtin/${id}.json`);
    return response.json();
  }
}
