export type IEither<T, U> = { success: true; data: T } | { success: false; error: U };
export type IArrayElement<ArrayType extends readonly unknown[]> = ArrayType[number];
export type IDeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? IDeepPartial<T[P]> : T[P];
};
export type IRect = { x: number; y: number; width: number; height: number };
export type INonNullObject<T> = {
  [K in keyof T as T[K] extends null ? never : K]: T[K];
};
// Bivariant assignability check via the function-trick. Distinguishes structurally distinct
// types but treats `{a?: number}` and `{b?: number}` as equal because optional-only field
// renames are mutually assignable under width subtyping. Used as a building block for IEquals.
type IBivariantEq<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

// Strict type equality. Combines bivariant assignability with key-set equality so an optional
// field rename (e.g. `clonedAt?` -> `cloned?`) is caught even though both shapes are mutually
// assignable. Note: only checks top-level keys; nested-type drift is caught by the IEquals
// assertion attached to that nested named-tier interface.
export type IEquals<A, B> = IBivariantEq<A, B> extends true ? IBivariantEq<keyof A, keyof B> : false;

export function c<T>(value: unknown): T {
  return value as T;
}
