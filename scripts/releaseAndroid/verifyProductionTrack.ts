import * as fs from "fs";
import { google } from "googleapis";

const PACKAGE_NAME = "com.liftosaur.www.twa";
const KEY_PATH = "./lambda/scripts/liftosaur-google-service-account-key.json";
const TRACK = "production";

function parseFlags(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "");
    out[key] = argv[i + 1];
  }
  return out;
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv);
  if (!flags.versionCode) {
    console.error("missing required flag --versionCode");
    process.exit(1);
  }
  const key: { client_email: string; private_key: string } = JSON.parse(fs.readFileSync(KEY_PATH, "utf8"));
  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  const play = google.androidpublisher({ version: "v3", auth });
  const edit = await play.edits.insert({ packageName: PACKAGE_NAME });
  const editId = edit.data.id ?? "";
  try {
    const track = await play.edits.tracks.get({ packageName: PACKAGE_NAME, editId, track: TRACK });
    const releases = track.data.releases ?? [];
    const match = releases.find((r) => (r.versionCodes ?? []).includes(flags.versionCode));
    for (const r of releases) {
      console.log(`${TRACK}: ${r.status} ${JSON.stringify(r.versionCodes ?? [])}`);
    }
    if (match == null) {
      console.error(`ERROR: versionCode ${flags.versionCode} is not on the ${TRACK} track. Nothing was published.`);
      process.exit(1);
    }
    console.log(`Verified: versionCode ${flags.versionCode} is on the ${TRACK} track with status ${match.status}.`);
  } finally {
    await play.edits.delete({ packageName: PACKAGE_NAME, editId });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
