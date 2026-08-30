import * as fs from "fs";
import * as path from "path";
import { localdomain, localapidomain, localport, localapiport } from "../src/localdomain";

const HOSTS = {
  prod: {
    host: "https://www.liftosaur.com",
    apiHost: "https://api3.liftosaur.com",
  },
  dev: {
    host: "https://stage.liftosaur.com",
    apiHost: "https://api3-dev.liftosaur.com",
  },
  local: {
    host: `https://${localdomain}.liftosaur.com:${localport}`,
    apiHost: `https://${localapidomain}.liftosaur.com:${localapiport}`,
  },
} as const;

type IStage = keyof typeof HOSTS;

function resolveStage(): IStage {
  if ((process.env.LOCAL ?? "").toLowerCase() === "1") {
    return "local";
  }
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
    .replace(/(const nativeApiHost = useLocal \? "[^"]+" : ")[^"]+(";)/, `$1${hosts.apiHost}$2`);
}

function replaceIosManifestURL(contents: string, manifestUrl: string): string {
  return contents.replace(/(<key>LftUpdatesManifestURL<\/key>\s*<string>)[^<]+(<\/string>)/, `$1${manifestUrl}$2`);
}

function replaceAndroidManifestURL(contents: string, manifestUrl: string): string {
  return contents.replace(/(<string name="lft_updates_manifest_url">)[^<]+(<\/string>)/, `$1${manifestUrl}$2`);
}

// Only the #if DEBUG branch is rewritten. The #else branch is what ships, and must stay on
// production regardless of which stage a developer is currently pointed at.
function replaceWatchHosts(contents: string, hosts: (typeof HOSTS)[IStage]): string {
  const debugStart = contents.indexOf("#if DEBUG");
  const debugEnd = contents.indexOf("#else", debugStart);
  if (debugStart < 0 || debugEnd < 0) {
    throw new Error("could not locate the #if DEBUG block in ios/Shared/Settings.swift");
  }
  const before = contents.slice(0, debugStart);
  const debugBlock = contents.slice(debugStart, debugEnd);
  const after = contents.slice(debugEnd);

  // The leading (?!\/\/) keeps the commented-out alternatives above and below each line intact.
  const replaceLet = (block: string, name: string, url: string): string => {
    const re = new RegExp(`^(?!\\s*//)(\\s*let ${name} = URL\\(string: ")[^"]+("\\)!)`, "m");
    if (!re.test(block)) {
      throw new Error(`could not locate an active '${name}' in the #if DEBUG block`);
    }
    return block.replace(re, `$1${url}$2`);
  };

  let updated = debugBlock;
  updated = replaceLet(updated, "baseUrl", hosts.host);
  updated = replaceLet(updated, "baseApiUrl", hosts.apiHost);
  updated = replaceLet(updated, "baseImageUrl", hosts.host);
  return before + updated + after;
}

function main(): void {
  const stage = resolveStage();
  const hosts = HOSTS[stage];
  const manifestUrl = `${hosts.host}/api/updates/manifest`;
  console.log(`stage=${stage} host=${hosts.host} manifest=${manifestUrl}`);

  syncFile("src/App.native.tsx", replaceNativeHosts, hosts);
  syncFile("ios/Liftosaur/Info.plist", replaceIosManifestURL, manifestUrl);
  // The watch has no Info.plist entry: it derives its manifest URL from baseUrl, so moving the
  // hosts moves the manifest with them and the two can never point at different stages.
  syncFile("ios/Shared/Settings.swift", replaceWatchHosts, hosts);
  syncFile("android/app/src/main/res/values/strings.xml", replaceAndroidManifestURL, manifestUrl);

  if (stage === "prod") {
    console.log(
      "\nNote: Debug builds now point at production. The watch runs whatever bundle it downloads " +
        "(no Metro fallback), so a Debug watch build will pick up production JS.\n" +
        "Run 'LOCAL=1 npm run sync:updates-url' to go back to the local dev server."
    );
  }
}

main();
