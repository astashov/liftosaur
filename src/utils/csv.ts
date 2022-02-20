export namespace CSV {
  export function toString(data: (number | string | null)[][]): string {
    return data
      .map((line) => {
        return line
          .map((value) => {
            let shouldWrapIntoQuotes = false;
            if (typeof value === "string") {
              if (value.indexOf(",") !== -1) {
                shouldWrapIntoQuotes = true;
              }
              if (value.indexOf('"') !== -1) {
                shouldWrapIntoQuotes = true;
                value = value.replace(/"/g, '\\"');
              }
              if (shouldWrapIntoQuotes) {
                value = `"${value}"`;
              }
            }
            if (value === null) {
              value = "";
            }
            return value;
          })
          .join(",");
      })
      .join("\n");
  }
}
