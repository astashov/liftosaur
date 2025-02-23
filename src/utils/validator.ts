import * as t from "io-ts";
import { IEither } from "./types";
import { PathReporter } from "io-ts/lib/PathReporter";

export class Validator {
  public static validate<I, O>(
    data: I,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: t.Type<any, any, any>
  ): IEither<O, string[]> {
    const decoded = type.decode(data);
    if ("left" in decoded) {
      const error = PathReporter.report(decoded);
      return { success: false, error };
    } else {
      return { success: true, data: decoded.right };
    }
  }
}
