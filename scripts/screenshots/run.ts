import { execFileSync, spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import sharp from "sharp";
import {
  IScreenshotsAssignment,
  IScreenshotsSim,
  ScreenshotsPlan_assign,
  ScreenshotsPlan_driverPort,
  ScreenshotsPlan_flowName,
  ScreenshotsPlan_ownsFile,
  ScreenshotsPlan_parseResults,
  ScreenshotsPlan_splitRunKey,
} from "./plan";
import { IWatchStep, WatchFlow_parse } from "./watchFlow";
import { ScreenshotsAccounts_open } from "./accounts";
import { ScreenshotsAccountStorage_email } from "./accountStorage";
import { FeatureImages_key, IFeatureImageSizes } from "../../src/pages/features/featureImages";

const root = path.resolve(__dirname, "../..");
const flowsDir = path.join(root, "screenshots/flows");
const watchFlowsDir = path.join(root, "screenshots/flows/watch");
const outDir = path.join(root, "images/features");
const sizesFile = path.join(root, "docs/features/screenshots.json");
const imageWidth = 600;
const derivedData = path.join(root, "ios/build/screenshots");
const appPath = path.join(derivedData, "Build/Products/Release-iphonesimulator/Liftosaur.app");
const watchAppPath = path.join(derivedData, "Build/Products/Release-watchsimulator/LiftosaurWatch.app");
const apkPath = path.join(root, "android/app/build/outputs/apk/release/app-release.apk");
const bundleId = "com.liftosaur.www";
const watchBundleId = "com.liftosaur.www.watchkitapp";
const androidPackage = "com.liftosaur.www.twa";
const phoneDeviceType = "com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro";
const watchDeviceType = "com.apple.CoreSimulator.SimDeviceType.Apple-Watch-Series-11-46mm";
const androidSdk = process.env.ANDROID_HOME || path.join(os.homedir(), "Library/Android/sdk");
const adbBin = path.join(androidSdk, "platform-tools/adb");
const emulatorBin = path.join(androidSdk, "emulator/emulator");
const defaultAvd = "Pixel_9_Pro_API_36";
const maestroBin = process.env.MAESTRO_BIN || path.join(os.homedir(), ".maestro/bin/maestro");
const secretsFile = path.join(os.homedir(), ".secrets/liftosaur-screenshots.env");
const watchSyncMs = 20000;
const flowAttempts = 2;
const wipeAttempts = 5;

interface IArgs {
  sims: number;
  udids?: string[];
  flows?: string[];
  skipBuild: boolean;
  android: boolean;
  avd: string;
  firstAccount: number;
}

interface ISimPair {
  phone: string;
  watch?: string;
}

interface IShot {
  file: string;
  name: string;
}

function parseArgs(argv: string[]): IArgs {
  const args: IArgs = { sims: 1, skipBuild: false, android: false, avd: defaultAvd, firstAccount: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--sims") {
      args.sims = parseInt(argv[++i], 10);
    } else if (a === "--udids") {
      args.udids = argv[++i].split(",");
    } else if (a === "--flows") {
      args.flows = argv[++i].split(",");
    } else if (a === "--skip-build") {
      args.skipBuild = true;
    } else if (a === "--android") {
      args.android = true;
    } else if (a === "--avd") {
      args.avd = argv[++i];
    } else if (a === "--first-account") {
      args.firstAccount = parseInt(argv[++i], 10);
    } else {
      throw new Error(`Unknown argument ${a}`);
    }
  }
  return args;
}

function password(): string {
  if (process.env.SCREENSHOTS_PASSWORD) {
    return process.env.SCREENSHOTS_PASSWORD;
  }
  if (fs.existsSync(secretsFile)) {
    const match = fs.readFileSync(secretsFile, "utf8").match(/SCREENSHOTS_PASSWORD=(.+)/);
    if (match) {
      return match[1].trim();
    }
  }
  throw new Error(`SCREENSHOTS_PASSWORD is not set and ${secretsFile} has no value`);
}

function simctl(...args: string[]): string {
  return execFileSync("xcrun", ["simctl", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
}

function simctlIgnoringFailure(...args: string[]): void {
  try {
    execFileSync("xcrun", ["simctl", ...args], { stdio: "ignore" });
  } catch (e) {
    return;
  }
}

function idb(...args: string[]): void {
  execFileSync("idb", args, { stdio: "ignore" });
}

function adb(...args: string[]): string {
  return execFileSync(adbBin, args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
}

function adbIgnoringFailure(...args: string[]): void {
  try {
    execFileSync(adbBin, args, { stdio: "ignore" });
  } catch (e) {
    return;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ISimDevice {
  name: string;
  udid: string;
  state: string;
}

function listSims(): ISimDevice[] {
  const parsed: { devices: Record<string, ISimDevice[]> } = JSON.parse(simctl("list", "devices", "available", "-j"));
  return Object.values(parsed.devices).flat();
}

function latestRuntime(platform: "iOS" | "watchOS"): string {
  const parsed: { runtimes: { identifier: string; platform: string; version: string; isAvailable: boolean }[] } =
    JSON.parse(simctl("list", "runtimes", "available", "-j"));
  const candidates = parsed.runtimes
    .filter((r) => r.platform === platform && r.isAvailable)
    .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
  if (candidates.length === 0) {
    throw new Error(`No ${platform} simulator runtime installed`);
  }
  return candidates[0].identifier;
}

function findOrCreateSim(name: string, deviceType: string, runtime: string): string {
  const existing = listSims().find((d) => d.name === name);
  if (existing != null) {
    return existing.udid;
  }
  console.log(`Creating simulator "${name}"`);
  return simctl("create", name, deviceType, runtime).trim();
}

function listPairs(): { watch: { udid: string }; phone: { udid: string } }[] {
  const parsed: { pairs: Record<string, { watch: { udid: string }; phone: { udid: string } }> } = JSON.parse(
    simctl("list", "pairs", "-j")
  );
  return Object.values(parsed.pairs);
}

function isPaired(watch: string, phone: string): boolean {
  return listPairs().some((p) => p.watch.udid === watch && p.phone.udid === phone);
}

function pairedWatch(phone: string): string | undefined {
  return listPairs().find((p) => p.phone.udid === phone)?.watch.udid;
}

function ensureSims(count: number): ISimPair[] {
  const iosRuntime = latestRuntime("iOS");
  const watchRuntime = latestRuntime("watchOS");
  const pairs: ISimPair[] = [];
  for (let i = 1; i <= count; i++) {
    const phone = findOrCreateSim(`Liftosaur screenshots ${i}`, phoneDeviceType, iosRuntime);
    const watch = findOrCreateSim(`Liftosaur screenshots watch ${i}`, watchDeviceType, watchRuntime);
    if (!isPaired(watch, phone)) {
      simctl("pair", watch, phone);
    }
    pairs.push({ phone, watch });
  }
  return pairs;
}

function bootSim(udid: string): void {
  const device = listSims().find((d) => d.udid === udid);
  if (device?.state !== "Booted") {
    simctl("boot", udid);
  }
  simctl("bootstatus", udid, "-b");
}

async function removeWhenReleased(dir: string): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch (e) {
      if (attempt >= wipeAttempts) {
        throw e;
      }
      await sleep(500);
    }
  }
}

async function wipeContainer(udid: string, appBundleId: string): Promise<void> {
  simctlIgnoringFailure("terminate", udid, appBundleId);
  const container = simctl("get_app_container", udid, appBundleId, "data").trim();
  for (const dir of ["Documents", "Library", "tmp"]) {
    await removeWhenReleased(path.join(container, dir));
    fs.mkdirSync(path.join(container, dir), { recursive: true });
  }
  fs.mkdirSync(path.join(container, "Library/Caches"), { recursive: true });
  fs.mkdirSync(path.join(container, "Library/Preferences"), { recursive: true });
}

async function wipeApps(pair: ISimPair): Promise<void> {
  await wipeContainer(pair.phone, bundleId);
  simctl("keychain", pair.phone, "reset");
  if (pair.watch != null && fs.existsSync(watchAppPath)) {
    await wipeContainer(pair.watch, watchBundleId);
    simctl("keychain", pair.watch, "reset");
  }
}

function xcodebuild(scheme: string, destination: string, log: string): void {
  const args = [
    "-workspace",
    "ios/Liftosaur.xcworkspace",
    "-scheme",
    scheme,
    "-configuration",
    "Release",
    "-destination",
    destination,
    "-derivedDataPath",
    derivedData,
    "SWIFT_ACTIVE_COMPILATION_CONDITIONS=$(inherited) DISABLE_OTA",
    "build",
  ];
  const fd = fs.openSync(log, "a");
  try {
    execFileSync("xcodebuild", args, {
      cwd: root,
      env: { ...process.env, EXTRA_PACKAGER_ARGS: "--reset-cache" },
      stdio: ["ignore", fd, fd],
    });
  } catch (e) {
    throw new Error(`xcodebuild ${scheme} failed, see ${log}`);
  } finally {
    fs.closeSync(fd);
  }
}

function buildIos(pair: ISimPair, log: string): void {
  console.log(`Building iOS Release apps (log: ${log})`);
  execFileSync("npm", ["run", "build:watch-bundle"], {
    cwd: root,
    env: { ...process.env, NODE_ENV: "production" },
    stdio: "ignore",
  });
  xcodebuild("Liftosaur", `platform=iOS Simulator,id=${pair.phone}`, log);
  if (pair.watch != null) {
    xcodebuild("LiftosaurWatch", `platform=watchOS Simulator,id=${pair.watch}`, log);
  }
}

function buildAndroid(log: string): void {
  console.log(`Building Android release APK (log: ${log})`);
  const fd = fs.openSync(log, "a");
  try {
    execFileSync("./gradlew", ["assembleRelease"], {
      cwd: path.join(root, "android"),
      env: { ...process.env, DISABLE_OTA: "true" },
      stdio: ["ignore", fd, fd],
    });
  } catch (e) {
    throw new Error(`gradlew assembleRelease failed, see ${log}`);
  } finally {
    fs.closeSync(fd);
  }
}

async function ensureEmulator(avd: string): Promise<string> {
  const devices = adb("devices")
    .split("\n")
    .slice(1)
    .map((l) => l.trim().split(/\s+/))
    .filter((parts) => parts[0]?.startsWith("emulator-") && parts[1] === "device")
    .map((parts) => parts[0]);
  if (devices.length > 0) {
    return devices[0];
  }
  console.log(`Starting emulator ${avd}`);
  const child = spawn(emulatorBin, ["-avd", avd, "-no-boot-anim", "-no-snapshot-save"], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  adb("wait-for-device");
  for (let i = 0; i < 120; i++) {
    if (adb("shell", "getprop", "sys.boot_completed").trim() === "1") {
      break;
    }
    await sleep(2000);
  }
  return adb("devices")
    .split("\n")
    .slice(1)
    .map((l) => l.trim().split(/\s+/)[0])
    .find((d) => d.startsWith("emulator-")) as string;
}

function wipeAndroidApp(): void {
  adb("shell", "pm", "clear", androidPackage);
  adbIgnoringFailure("shell", "pm", "grant", androidPackage, "android.permission.POST_NOTIFICATIONS");
  adbIgnoringFailure("shell", "settings", "put", "secure", "autofill_service", "null");
  adbIgnoringFailure("shell", "input", "keyevent", "BACK");
}

function listFlows(dir: string, extension: string, filter?: string[]): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const all = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(extension))
    .map((f) => path.join(dir, f))
    .sort();
  return filter == null ? all : all.filter((f) => filter.includes(ScreenshotsPlan_flowName(f)));
}

function runMaestro(
  assignment: IScreenshotsAssignment,
  appId: string,
  debugDir: string,
  pass: string
): Promise<{ output: string; code: number }> {
  return new Promise((resolve) => {
    const args = [
      "--udid",
      assignment.sim.udid,
      "--driver-host-port",
      String(assignment.sim.driverPort),
      "test",
      "-e",
      `APP_ID=${appId}`,
      "-e",
      `EMAIL=${assignment.sim.email}`,
      "-e",
      `PASSWORD=${pass}`,
      "--debug-output",
      debugDir,
      ...assignment.flows,
    ];
    fs.mkdirSync(debugDir, { recursive: true });
    const logFile = path.join(debugDir, "maestro.log");
    console.log(`${path.basename(debugDir)}: tail -f ${logFile}`);
    const log = fs.createWriteStream(logFile);
    const child = spawn(maestroBin, args, { cwd: root });
    let output = "";
    let pending = "";
    const append = (chunk: Buffer): void => {
      pending += chunk.toString();
      const lastNewline = pending.lastIndexOf("\n");
      if (lastNewline === -1) {
        return;
      }
      const lines = pending.slice(0, lastNewline + 1);
      pending = pending.slice(lastNewline + 1);
      output += lines;
      log.write(lines.split(pass).join("<password>"));
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    child.on("close", (code) => {
      output += pending;
      log.end(pending.split(pass).join("<password>"));
      resolve({ output, code: code ?? 1 });
    });
  });
}

async function runWatchFlow(watch: string, steps: IWatchStep[], shotsDir: string): Promise<IShot[]> {
  fs.mkdirSync(shotsDir, { recursive: true });
  idb("connect", watch);
  const shots: IShot[] = [];
  for (const step of steps) {
    switch (step.type) {
      case "launch":
        simctlIgnoringFailure("terminate", watch, step.bundleId);
        simctl("launch", watch, step.bundleId);
        break;
      case "wait":
        await sleep(step.ms);
        break;
      case "tap":
        idb("ui", "tap", "--udid", watch, String(step.x), String(step.y));
        break;
      case "swipe":
        idb("ui", "swipe", "--udid", watch, ...[...step.from, ...step.to].map(String));
        break;
      case "screenshot": {
        const file = path.join(shotsDir, `${step.name}.png`);
        execFileSync("xcrun", ["simctl", "io", watch, "screenshot", file], { stdio: "ignore" });
        shots.push({ file, name: step.name });
        break;
      }
    }
  }
  return shots;
}

function findScreenshots(dir: string, prefix: string): Record<string, IShot[]> {
  const found: Record<string, IShot[]> = {};
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".png") && path.basename(current) === "takeScreenshot") {
        const flow = path.basename(path.dirname(current));
        (found[flow] = found[flow] || []).push({ file: full, name: `${prefix}${path.basename(entry.name, ".png")}` });
      }
    }
  };
  if (fs.existsSync(dir)) {
    walk(dir);
  }
  return found;
}

async function collect(key: string, shots: IShot[], sizes: IFeatureImageSizes): Promise<number> {
  const { prefix, flow } = ScreenshotsPlan_splitRunKey(key);
  const target = path.join(outDir, flow);
  fs.mkdirSync(target, { recursive: true });
  for (const file of fs.readdirSync(target)) {
    if (ScreenshotsPlan_ownsFile(prefix, file)) {
      fs.rmSync(path.join(target, file));
      delete sizes[FeatureImages_key(flow, path.basename(file, ".webp"))];
    }
  }
  for (const shot of shots) {
    const info = await sharp(shot.file)
      .resize({ width: imageWidth, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(target, `${shot.name}.webp`));
    sizes[FeatureImages_key(flow, shot.name)] = { width: info.width, height: info.height };
  }
  return shots.length;
}

function readSizes(): IFeatureImageSizes {
  return fs.existsSync(sizesFile) ? JSON.parse(fs.readFileSync(sizesFile, "utf8")) : {};
}

function writeSizes(sizes: IFeatureImageSizes): void {
  const sorted = Object.fromEntries(
    Object.keys(sizes)
      .sort()
      .map((k) => [k, sizes[k]])
  );
  fs.writeFileSync(sizesFile, `${JSON.stringify(sorted, null, 2)}\n`);
}

interface IRunState {
  shotsByFlow: Record<string, IShot[]>;
  statusByFlow: Record<string, "passed" | "failed">;
}

function recordFlow(state: IRunState, flow: string, status: "passed" | "failed", shots: IShot[]): void {
  state.statusByFlow[flow] = state.statusByFlow[flow] === "failed" ? "failed" : status;
  state.shotsByFlow[flow] = [...(state.shotsByFlow[flow] ?? []), ...shots];
}

async function runPhoneFlows(
  state: IRunState,
  sim: IScreenshotsSim,
  flows: string[],
  appId: string,
  prefix: string,
  wipe: () => Promise<void>,
  runDir: string,
  pass: string
): Promise<void> {
  for (const flowPath of flows) {
    const flow = ScreenshotsPlan_flowName(flowPath);
    let status: "passed" | "failed" = "failed";
    let shots: IShot[] = [];
    for (let attempt = 1; attempt <= flowAttempts && status === "failed"; attempt++) {
      const debugDir = path.join(runDir, `${prefix || "ios-"}${sim.udid}`, attempt === 1 ? flow : `${flow}-retry`);
      await wipe();
      const result = await runMaestro({ sim, flows: [flowPath] }, appId, debugDir, pass);
      status = ScreenshotsPlan_parseResults(result.output)[flow] ?? (result.code === 0 ? "passed" : "failed");
      shots = findScreenshots(debugDir, prefix)[flow] ?? [];
    }
    recordFlow(state, `${prefix}${flow}`, status, shots);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const pass = password();
  const flows = listFlows(flowsDir, ".yaml", args.flows);
  const watchFlows = args.udids ? [] : listFlows(watchFlowsDir, ".txt", args.flows);
  if (flows.length === 0 && watchFlows.length === 0) {
    throw new Error(`No flows found in ${flowsDir}`);
  }
  const pairs: ISimPair[] = args.udids
    ? args.udids.map((phone) => ({ phone, watch: pairedWatch(phone) }))
    : ensureSims(args.sims);
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "liftosaur-screenshots-"));
  if (!args.skipBuild) {
    if (pairs.length > 0) {
      buildIos(pairs[0], path.join(runDir, "build-ios.log"));
    }
    if (args.android) {
      buildAndroid(path.join(runDir, "build-android.log"));
    }
  }
  if (pairs.length > 0 && !fs.existsSync(appPath)) {
    throw new Error(`No app at ${appPath}. Run without --skip-build first.`);
  }
  if (args.android && !fs.existsSync(apkPath)) {
    throw new Error(`No APK at ${apkPath}. Run without --skip-build first.`);
  }
  for (const pair of pairs) {
    bootSim(pair.phone);
    simctl("install", pair.phone, appPath);
    if (pair.watch != null && fs.existsSync(watchAppPath)) {
      bootSim(pair.watch);
      const firstInstall = !simctl("listapps", pair.watch).includes(watchBundleId);
      simctl("install", pair.watch, watchAppPath);
      if (firstInstall) {
        console.log(`Answering the Health permission sheet on watch ${pair.watch}`);
        const steps = WatchFlow_parse(fs.readFileSync(path.join(watchFlowsDir, "lib/health-permissions.txt"), "utf8"));
        await runWatchFlow(pair.watch, steps, path.join(runDir, "watch-permissions"));
      }
    }
  }
  const accounts = ScreenshotsAccounts_open(pass);
  const sims: IScreenshotsSim[] = pairs.map((pair, i) => ({
    udid: pair.phone,
    email: ScreenshotsAccountStorage_email(args.firstAccount + i),
    driverPort: ScreenshotsPlan_driverPort(i),
  }));
  const freshIos = async (i: number): Promise<void> => {
    await wipeApps(pairs[i]);
    await accounts.reset(args.firstAccount + i);
  };
  const warmup = path.join(flowsDir, "lib/warmup.yaml");
  const warmupHealth = path.join(flowsDir, "lib/warmup-health.yaml");
  const healthSteps = WatchFlow_parse(fs.readFileSync(path.join(flowsDir, "lib/health-permissions.txt"), "utf8"));
  console.log(`Warming up ${sims.length} simulator(s): system permission prompts`);
  await Promise.all(
    sims.map(async (sim, i) => {
      await freshIos(i);
      await runMaestro({ sim, flows: [warmupHealth] }, bundleId, path.join(runDir, "warmup-health"), pass);
      await runWatchFlow(sim.udid, healthSteps, path.join(runDir, "warmup-health"));
      await freshIos(i);
      return runMaestro({ sim, flows: [warmup] }, bundleId, path.join(runDir, "warmup"), pass);
    })
  );
  const assignments = sims.length > 0 ? ScreenshotsPlan_assign(flows, sims) : [];
  const watchAssignments = sims.length > 0 ? ScreenshotsPlan_assign(watchFlows, sims) : [];
  console.log(
    `Running ${flows.length} phone flow(s) and ${watchFlows.length} watch flow(s) on ${sims.length} simulator(s), output in ${runDir}`
  );
  const started = Date.now();
  const state: IRunState = { shotsByFlow: {}, statusByFlow: {} };

  const iosRuns = sims.map(async (sim, i) => {
    const assignment = assignments.find((a) => a.sim.udid === sim.udid);
    await runPhoneFlows(state, sim, assignment?.flows ?? [], bundleId, "", () => freshIos(i), runDir, pass);
    const watchAssignment = watchAssignments.find((a) => a.sim.udid === sim.udid);
    const watch = pairs[i].watch;
    if (watchAssignment != null && watch != null) {
      await freshIos(i);
      simctl("launch", watch, watchBundleId);
      await runMaestro(
        { sim, flows: [path.join(flowsDir, "lib/login.yaml")] },
        bundleId,
        path.join(runDir, `sim-${i + 1}-watch-login`),
        pass
      );
      simctlIgnoringFailure("terminate", sim.udid, bundleId);
      simctl("launch", sim.udid, bundleId);
      await sleep(watchSyncMs);
      for (const flowPath of watchAssignment.flows) {
        const flow = ScreenshotsPlan_flowName(flowPath);
        try {
          const shots = await runWatchFlow(
            watch,
            WatchFlow_parse(fs.readFileSync(flowPath, "utf8")),
            path.join(runDir, `watch-${flow}`)
          );
          recordFlow(state, `watch-${flow}`, "passed", shots);
        } catch (e) {
          recordFlow(state, `watch-${flow}`, "failed", []);
          fs.writeFileSync(path.join(runDir, `watch-${flow}.log`), e instanceof Error ? e.message : String(e));
        }
      }
    }
  });

  const androidRun = (async () => {
    if (!args.android) {
      return;
    }
    const serial = await ensureEmulator(args.avd);
    adb("-s", serial, "install", "-r", apkPath);
    const sim: IScreenshotsSim = {
      udid: serial,
      email: ScreenshotsAccountStorage_email(args.firstAccount + sims.length),
      driverPort: ScreenshotsPlan_driverPort(sims.length),
    };
    const freshAndroid = async (): Promise<void> => {
      wipeAndroidApp();
      await accounts.reset(args.firstAccount + sims.length);
    };
    console.log(`Running ${flows.length} flow(s) on Android ${serial} as ${sim.email}`);
    await freshAndroid();
    await runMaestro({ sim, flows: [warmup] }, androidPackage, path.join(runDir, "warmup-android"), pass);
    await runPhoneFlows(state, sim, flows, androidPackage, "android-", freshAndroid, runDir, pass);
  })();

  await Promise.all([...iosRuns, androidRun]);

  let failed = 0;
  const sizes = readSizes();
  for (const flow of Object.keys(state.statusByFlow).sort()) {
    const status = state.statusByFlow[flow];
    const count = status === "passed" ? await collect(flow, state.shotsByFlow[flow] ?? [], sizes) : 0;
    if (status === "failed") {
      failed++;
    }
    console.log(`${status === "passed" ? "PASS" : "FAIL"}  ${flow}  ${count} screenshot(s)`);
  }
  writeSizes(sizes);
  console.log(`Done in ${Math.round((Date.now() - started) / 1000)}s. ${failed} failed. Logs: ${runDir}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
