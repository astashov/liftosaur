export type IEither<T, U> = { success: true; data: T } | { success: false; error: U };
export type IArrayElement<ArrayType extends readonly unknown[]> = ArrayType[number];
