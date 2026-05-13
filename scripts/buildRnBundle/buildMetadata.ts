import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

interface IExpoExportMetadata {
  version: number;
  bundler: string;
  fileMetadata: {
    [platform: string]: {
      bundle: string;
      assets: { path: string; ext: string }[];
    };
  };
}

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

const EXT_TO_CONTENT_TYPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
  json: "application/json",
};

function BuildMetadata_sha256Base64Url(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("base64url");
}

function BuildMetadata_keyFromPath(p: string): string {
  return path.basename(p, path.extname(p));
}

function BuildMetadata_contentType(ext: string): string {
  return EXT_TO_CONTENT_TYPE[ext.toLowerCase()] ?? "application/octet-stream";
}

export function BuildMetadata_build(args: {
  platform: "ios" | "android";
  runtimeVersion: string;
  updateId: string;
  createdAt: string;
  inputDir: string;
  urlPrefix: string;
}): IUpdateMetadataFile {
  const exportMetadataPath = path.join(args.inputDir, "metadata.json");
  const exportMetadata = JSON.parse(fs.readFileSync(exportMetadataPath, "utf8")) as IExpoExportMetadata;
  const platformBlock = exportMetadata.fileMetadata[args.platform];
  if (!platformBlock) {
    throw new Error(`expo export did not produce a bundle for ${args.platform}`);
  }

  const bundleRelPath = platformBlock.bundle;
  const bundleAbsPath = path.join(args.inputDir, bundleRelPath);
  const launchAsset: IUpdateAsset = {
    hash: BuildMetadata_sha256Base64Url(bundleAbsPath),
    key: BuildMetadata_keyFromPath(bundleRelPath),
    contentType: "application/javascript",
    fileExtension: ".bundle",
    url: `${args.urlPrefix}/${bundleRelPath}`,
  };

  const assets: IUpdateAsset[] = platformBlock.assets.map((asset) => {
    const absPath = path.join(args.inputDir, asset.path);
    return {
      hash: BuildMetadata_sha256Base64Url(absPath),
      key: BuildMetadata_keyFromPath(asset.path),
      contentType: BuildMetadata_contentType(asset.ext),
      fileExtension: `.${asset.ext}`,
      url: `${args.urlPrefix}/${asset.path}`,
    };
  });

  return {
    id: args.updateId,
    createdAt: args.createdAt,
    runtimeVersion: args.runtimeVersion,
    launchAsset,
    assets,
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
  const required = ["platform", "runtimeVersion", "updateId", "createdAt", "inputDir", "urlPrefix", "outputFile"];
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
    inputDir: flags.inputDir,
    urlPrefix: flags.urlPrefix,
  });
  fs.writeFileSync(flags.outputFile, JSON.stringify(metadata, null, 2));
  console.log(`wrote ${flags.outputFile}`);
}
