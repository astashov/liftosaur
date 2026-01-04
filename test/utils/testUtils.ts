/* eslint-disable @typescript-eslint/no-explicit-any */
import * as util from "util";

export function cl(...args: any): void {
  console.log(util.inspect(args, { depth: null, colors: true, compact: false }));
}
