/* eslint-disable @typescript-eslint/ban-types */
export type IEither<T, U> = { success: true; data: T } | { success: false; error: U };
export type IArrayElement<ArrayType extends readonly unknown[]> = ArrayType[number];
export type IDeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? IDeepPartial<T[P]> : T[P];
};
