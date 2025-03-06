/* eslint-disable @typescript-eslint/ban-types */
export type IEither<T, U> = { success: true; data: T } | { success: false; error: U };
export type IArrayElement<ArrayType extends readonly unknown[]> = ArrayType[number];
export type IDeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? IDeepPartial<T[P]> : T[P];
};
export type IRect = { x: number; y: number; width: number; height: number };
export type INonNullObject<T> = {
  [K in keyof T as T[K] extends null ? never : K]: T[K];
};
