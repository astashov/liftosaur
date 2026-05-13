import * as fs from "fs";
import * as path from "path";

const HOSTS = {
  prod: "www.liftosaur.com",
  dev: "stage.liftosaur.com",
} as const;

type IStage = keyof typeof HOSTS;

function resolveStage(): IStage {
  const raw = (process.env.STAGE ?? "prod").toLowerCase();
  if (raw === "1" || raw === "dev" || raw === "stage") return "dev";
  if (raw === "0" || raw === "prod" || raw === "production") return "prod";
  throw new Error(`unrecognized STAGE=${raw} (expected dev|prod|stage|production|1|0)`);
}

function syncFile(filePath: string, replacer: (contents: string, url: string) => string, url: string): void {
  const abs = path.resolve(__dirname, "..", filePath);
  const before = fs.readFileSync(abs, "utf8");
  const after = replacer(before, url);
  if (before !== after) {
    fs.writeFileSync(abs, after);
    console.log(`updated ${filePath}`);
  } else {
    console.log(`unchanged ${filePath}`);
  }
}

function main(): void {
  const stage = resolveStage();
  const url = `https://${HOSTS[stage]}/api/updates/manifest`;
  console.log(`stage=${stage} → ${url}`);

  syncFile(
    "ios/Liftosaur/Expo.plist",
    (contents, value) =>
      contents.replace(
        /(<key>EXUpdatesURL<\/key>\s*<string>)[^<]+(<\/string>)/,
        `$1${value}$2`
      ),
    url
  );

  syncFile(
    "android/app/src/main/AndroidManifest.xml",
    (contents, value) =>
      contents.replace(
        /(android:name="expo\.modules\.updates\.EXPO_UPDATE_URL" android:value=")[^"]+(")/,
        `$1${value}$2`
      ),
    url
  );

  syncFile(
    "app.json",
    (contents, value) => contents.replace(/("url":\s*")[^"]+(")/, `$1${value}$2`),
    url
  );
}

main();
