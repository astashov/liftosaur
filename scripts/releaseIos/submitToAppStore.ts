import * as fs from "fs";
import * as jwt from "jsonwebtoken";

const API_BASE_URL = "https://api.appstoreconnect.apple.com/v1";
const BUNDLE_ID = "com.liftosaur.www";
const ISSUER_ID = "4c82c687-0990-4745-ac91-89ab459a6c5c";
const KEY_ID = "F286YBUYZ7";
const KEY_PATH = "./lambda/scripts/AuthKey_F286YBUYZ7.p8";
const LOCALE = "en-US";
const BUILD_POLL_INTERVAL_MS = 60 * 1000;
const BUILD_POLL_TIMEOUT_MS = 45 * 60 * 1000;

const REUSABLE_VERSION_STATES = [
  "PREPARE_FOR_SUBMISSION",
  "DEVELOPER_REJECTED",
  "REJECTED",
  "METADATA_REJECTED",
  "INVALID_BINARY",
];
const OPEN_SUBMISSION_STATES = ["READY_FOR_REVIEW"];

interface IResource<T> {
  id: string;
  attributes: T;
}

interface IBuildAttributes {
  version: string;
  processingState: "PROCESSING" | "FAILED" | "INVALID" | "VALID";
  expired: boolean;
  uploadedDate: string;
}

interface IAppStoreVersionAttributes {
  versionString: string;
  appVersionState: string;
  releaseType: string;
}

interface ILocalizationAttributes {
  locale: string;
  whatsNew: string | null;
}

interface IReviewSubmissionAttributes {
  state: string;
  platform: string;
}

function parseFlags(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "");
    out[key] = argv[i + 1];
  }
  return out;
}

function generateJwt(): string {
  const privateKey = fs.readFileSync(KEY_PATH, "utf8");
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({ iss: ISSUER_ID, iat: now, exp: now + 10 * 60, aud: "appstoreconnect-v1" }, privateKey, {
    algorithm: "ES256",
    header: { alg: "ES256", kid: KEY_ID, typ: "JWT" },
  });
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = path.startsWith("https://") ? path : `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${generateJwt()}`,
      "Content-Type": "application/json",
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status}\n${text}`);
  }
  return text.length > 0 ? JSON.parse(text) : undefined;
}

async function fetchAppId(): Promise<string> {
  const result = await request<{ data: IResource<{ bundleId: string }>[] }>(
    "GET",
    `/apps?filter[bundleId]=${BUNDLE_ID}`
  );
  if (result.data.length === 0) {
    throw new Error(`No app with bundle id ${BUNDLE_ID}`);
  }
  return result.data[0].id;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForProcessedBuild(appId: string, version: string, buildNumber: string): Promise<string> {
  const deadline = Date.now() + BUILD_POLL_TIMEOUT_MS;
  const path =
    `/builds?filter[app]=${appId}&filter[preReleaseVersion.version]=${version}` +
    `&filter[version]=${buildNumber}&filter[expired]=false&sort=-uploadedDate&limit=5` +
    `&fields[builds]=version,processingState,expired,uploadedDate`;
  while (true) {
    const result = await request<{ data: IResource<IBuildAttributes>[] }>("GET", path);
    const build = result.data[0];
    const state = build?.attributes.processingState;
    if (build != null && state === "VALID") {
      console.log(`Build ${version} (${buildNumber}) processed: ${build.id}`);
      return build.id;
    }
    if (state === "FAILED" || state === "INVALID") {
      throw new Error(`Build ${version} (${buildNumber}) processing ended in state ${state}`);
    }
    if (Date.now() > deadline) {
      throw new Error(
        `Build ${version} (${buildNumber}) still not processed after ${BUILD_POLL_TIMEOUT_MS / 60000} minutes`
      );
    }
    console.log(`${new Date().toLocaleTimeString()} build ${version} (${buildNumber}): ${state ?? "not visible yet"}, waiting...`);
    await sleep(BUILD_POLL_INTERVAL_MS);
  }
}

async function findOrCreateAppStoreVersion(appId: string, version: string): Promise<string> {
  const existing = await request<{ data: IResource<IAppStoreVersionAttributes>[] }>(
    "GET",
    `/apps/${appId}/appStoreVersions?filter[platform]=IOS&filter[versionString]=${version}` +
      `&fields[appStoreVersions]=versionString,appVersionState,releaseType`
  );
  const found = existing.data[0];
  if (found != null) {
    if (!REUSABLE_VERSION_STATES.includes(found.attributes.appVersionState)) {
      throw new Error(`App Store version ${version} already exists in state ${found.attributes.appVersionState}`);
    }
    console.log(`Reusing App Store version ${version} (${found.attributes.appVersionState}): ${found.id}`);
    if (found.attributes.releaseType !== "MANUAL") {
      await request("PATCH", `/appStoreVersions/${found.id}`, {
        data: { type: "appStoreVersions", id: found.id, attributes: { releaseType: "MANUAL" } },
      });
    }
    return found.id;
  }
  const created = await request<{ data: IResource<IAppStoreVersionAttributes> }>("POST", "/appStoreVersions", {
    data: {
      type: "appStoreVersions",
      attributes: { platform: "IOS", versionString: version, releaseType: "MANUAL" },
      relationships: { app: { data: { type: "apps", id: appId } } },
    },
  });
  console.log(`Created App Store version ${version} (manual release): ${created.data.id}`);
  return created.data.id;
}

async function attachBuild(versionId: string, buildId: string): Promise<void> {
  await request("PATCH", `/appStoreVersions/${versionId}/relationships/build`, {
    data: { type: "builds", id: buildId },
  });
  console.log("Attached build to the version");
}

async function setWhatsNew(versionId: string, notes: string): Promise<void> {
  const result = await request<{ data: IResource<ILocalizationAttributes>[] }>(
    "GET",
    `/appStoreVersions/${versionId}/appStoreVersionLocalizations`
  );
  const localization = result.data.find((l) => l.attributes.locale === LOCALE);
  if (localization != null) {
    await request("PATCH", `/appStoreVersionLocalizations/${localization.id}`, {
      data: { type: "appStoreVersionLocalizations", id: localization.id, attributes: { whatsNew: notes } },
    });
  } else {
    await request("POST", "/appStoreVersionLocalizations", {
      data: {
        type: "appStoreVersionLocalizations",
        attributes: { locale: LOCALE, whatsNew: notes },
        relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: versionId } } },
      },
    });
  }
  console.log(`Set ${LOCALE} release notes (${notes.length} chars)`);
}

async function submitForReview(appId: string, versionId: string): Promise<void> {
  const open = await request<{ data: IResource<IReviewSubmissionAttributes>[] }>(
    "GET",
    `/reviewSubmissions?filter[app]=${appId}&filter[platform]=IOS&filter[state]=${OPEN_SUBMISSION_STATES.join(",")}`
  );
  let submissionId = open.data[0]?.id;
  if (submissionId == null) {
    const created = await request<{ data: IResource<IReviewSubmissionAttributes> }>("POST", "/reviewSubmissions", {
      data: {
        type: "reviewSubmissions",
        attributes: { platform: "IOS" },
        relationships: { app: { data: { type: "apps", id: appId } } },
      },
    });
    submissionId = created.data.id;
  }
  const items = await request<{ data: { id: string; relationships?: { appStoreVersion?: { data?: { id: string } } } }[] }>(
    "GET",
    `/reviewSubmissions/${submissionId}/items?include=appStoreVersion`
  );
  const alreadyIncluded = items.data.some((item) => item.relationships?.appStoreVersion?.data?.id === versionId);
  if (!alreadyIncluded) {
    await request("POST", "/reviewSubmissionItems", {
      data: {
        type: "reviewSubmissionItems",
        relationships: {
          reviewSubmission: { data: { type: "reviewSubmissions", id: submissionId } },
          appStoreVersion: { data: { type: "appStoreVersions", id: versionId } },
        },
      },
    });
  }
  await request("PATCH", `/reviewSubmissions/${submissionId}`, {
    data: { type: "reviewSubmissions", id: submissionId, attributes: { submitted: true } },
  });
  console.log(`Submitted for review: ${submissionId}`);
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv);
  for (const key of ["version", "build", "notesFile"]) {
    if (!flags[key]) {
      console.error(`missing required flag --${key}`);
      process.exit(1);
    }
  }
  const notes = fs.readFileSync(flags.notesFile, "utf8").trim();
  if (notes.length === 0) {
    throw new Error(`Release notes file ${flags.notesFile} is empty`);
  }
  const appId = await fetchAppId();
  const buildId = await waitForProcessedBuild(appId, flags.version, flags.build);
  const versionId = await findOrCreateAppStoreVersion(appId, flags.version);
  await attachBuild(versionId, buildId);
  await setWhatsNew(versionId, notes);
  await submitForReview(appId, versionId);
  console.log("");
  console.log(`Version ${flags.version} is in review. Release type is manual: after approval it waits`);
  console.log(`in App Store Connect until you press "Release This Version".`);
  console.log(`https://appstoreconnect.apple.com/apps/${appId}/distribution/ios/version/inflight`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
