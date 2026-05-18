import * as fs from "fs";
import * as path from "path";

const HOSTS = {
  prod: {
    host: "https://www.liftosaur.com",
    apiHost: "https://api3.liftosaur.com",
    streamingApiHost: "https://streaming-api.liftosaur.com",
  },
  dev: {
    host: "https://stage.liftosaur.com",
    apiHost: "https://api3-dev.liftosaur.com",
    streamingApiHost: "https://streaming-api-dev.liftosaur.com",
  },
} as const;

type IStage = keyof typeof HOSTS;

function resolveStage(): IStage {
  const raw = (process.env.STAGE ?? "prod").toLowerCase();
  if (raw === "1" || raw === "dev" || raw === "stage") {
    return "dev";
  }
  if (raw === "0" || raw === "prod" || raw === "production") {
    return "prod";
  }
  throw new Error(`unrecognized STAGE=${raw} (expected dev|prod|stage|production|1|0)`);
}

function syncFile<T>(filePath: string, replacer: (contents: string, v: T) => string, value: T): void {
  const abs = path.resolve(__dirname, "..", filePath);
  const before = fs.readFileSync(abs, "utf8");
  const after = replacer(before, value);
  if (before !== after) {
    fs.writeFileSync(abs, after);
    console.log(`updated ${filePath}`);
  } else {
    console.log(`unchanged ${filePath}`);
  }
}

function replaceNativeHosts(contents: string, hosts: (typeof HOSTS)[IStage]): string {
  return contents
    .replace(/(const nativeHost = useLocal \? "[^"]+" : ")[^"]+(";)/, `$1${hosts.host}$2`)
    .replace(/(const nativeApiHost = useLocal \? "[^"]+" : ")[^"]+(";)/, `$1${hosts.apiHost}$2`)
    .replace(
      /(const nativeStreamingApiHost = useLocal\s*\?\s*"[^"]+"\s*:\s*")[^"]+(";)/,
      `$1${hosts.streamingApiHost}$2`
    );
}

function main(): void {
  const stage = resolveStage();
  const hosts = HOSTS[stage];
  console.log(`stage=${stage} → ${hosts.host}`);

  syncFile("src/App.native.tsx", replaceNativeHosts, hosts);
}

main();
