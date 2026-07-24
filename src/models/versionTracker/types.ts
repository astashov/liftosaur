export interface IVectorClock {
  vc: { [deviceId: string]: number };
  t: number;
}

export interface IIdVersion extends IVectorClock {
  value: string;
}

export type IFieldVersion = number | IVectorClock | IIdVersion;

export interface IVersionsObject {
  [key: string]: IVersionValue | undefined;
}

export type IVersionValue = IFieldVersion | IVersionsObject | ICollectionVersions;

export type IVersions<T> = {
  [K in keyof T & string]?: IVersionValue;
};

export interface ICollectionVersions {
  items?: Record<string, IVersionsObject | IFieldVersion>;
  deleted?: Record<string, number>;
  nukedeleted?: number;
}

export type ITypedObject<T extends string = string> = { vtype: T } & Record<string, unknown>;

export interface IVersionTypes<TAtomicType extends string, TControlledType extends string> {
  atomicTypes: readonly TAtomicType[];
  controlledTypes: readonly TControlledType[];
  typeIdMapping: Record<TAtomicType | TControlledType, string>;
  controlledFields: Record<TControlledType, readonly string[]>;
  excludedFields?: Partial<Record<TControlledType, readonly string[]>>;
  dictionaryFields: readonly string[];
  compactionThresholds?: Record<string, number>;
  typeValidators?: Partial<Record<TControlledType, { is: (u: unknown) => boolean }>>;
}

export function isVectorClock(v: unknown): v is IVectorClock {
  return typeof v === "object" && v !== null && "vc" in v && "t" in v;
}

export function isIdVersion(v: unknown): v is IIdVersion {
  return isVectorClock(v) && "value" in v && typeof (v as IIdVersion).value === "string";
}

export function isFieldVersion(v: unknown): v is IFieldVersion {
  return typeof v === "number" || isVectorClock(v);
}

export function isCollectionVersions(v: unknown): v is ICollectionVersions {
  return v !== null && typeof v === "object" && ("items" in v || "deleted" in v);
}

export function isVersionsObject(v: unknown): v is IVersionsObject {
  return v !== null && typeof v === "object" && !isCollectionVersions(v) && !isFieldVersion(v);
}
