export namespace Utils {
  export function getEnv(): "dev" | "prod" {
    return process.env.IS_DEV === "true" ? "dev" : "prod";
  }
}
