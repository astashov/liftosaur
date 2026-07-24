import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

interface IUpdateAsset {
  hash: string;
  key: string;
  contentType: string;
  fileExtension: string;
  url: string;
}

interface IUpdateMetadataFile {
  id: string;
  createdAt: string;
  runtimeVersion: string;
  launchAsset: IUpdateAsset;
  assets: IUpdateAsset[];
  metadata: Record<string, unknown>;
  extra: Record<string, unknown>;
}

function BuildMetadata_sha256Base64Url(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("base64url");
}

function BuildMetadata_keyFromPath(p: string): string {
  return path.basename(p, path.extname(p));
}

export function BuildMetadata_build(args: {
  platform: "ios" | "android";
  runtimeVersion: string;
  updateId: string;
  createdAt: string;
  bundlePath: string;
  bundleUrl: string;
}): IUpdateMetadataFile {
  return {
    id: args.updateId,
    createdAt: args.createdAt,
    runtimeVersion: args.runtimeVersion,
    launchAsset: {
      hash: BuildMetadata_sha256Base64Url(args.bundlePath),
      key: BuildMetadata_keyFromPath(args.bundlePath),
      contentType: "application/javascript",
      fileExtension: ".bundle",
      url: args.bundleUrl,
    },
    assets: [],
    metadata: {},
    extra: {},
  };
}

function parseFlags(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "");
    out[key] = argv[i + 1];
  }
  return out;
}

if (require.main === module) {
  const flags = parseFlags(process.argv);
  const required = ["platform", "runtimeVersion", "updateId", "createdAt", "bundlePath", "bundleUrl", "outputFile"];
  for (const key of required) {
    if (!flags[key]) {
      console.error(`missing required flag --${key}`);
      process.exit(1);
    }
  }
  if (flags.platform !== "ios" && flags.platform !== "android") {
    console.error(`platform must be ios or android, got ${flags.platform}`);
    process.exit(1);
  }
  const metadata = BuildMetadata_build({
    platform: flags.platform as "ios" | "android",
    runtimeVersion: flags.runtimeVersion,
    updateId: flags.updateId,
    createdAt: flags.createdAt,
    bundlePath: flags.bundlePath,
    bundleUrl: flags.bundleUrl,
  });
  fs.writeFileSync(flags.outputFile, JSON.stringify(metadata, null, 2));
  console.log(`wrote ${flags.outputFile}`);
}
