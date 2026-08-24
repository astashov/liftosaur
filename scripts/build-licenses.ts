import * as fs from "fs";
import * as path from "path";

const root = path.resolve(__dirname, "..");
const canonicalDir = path.join(__dirname, "licenses", "canonical");

// Which packages ship is read out of the source maps of the real bundles rather than
// out of package.json, because the dependency tree is a poor proxy: react-native alone
// pulls in the whole Metro/CLI toolchain, and lambda-only deps (sharp, satori, @resvg)
// carry no redistribution obligation since those binaries never leave our servers.
const WEB_MAP_DIRS = ["dist", "dist/chunks"];
const NATIVE_MAPS = ["dist-rn/ios/main.jsbundle.map", "dist-rn/android/index.android.bundle.map"];
const CACHE_PATH = path.join(__dirname, "licenses", "shipped-packages.json");

interface IEntry {
  name: string;
  version?: string;
  license: string;
  copyright?: string;
  text: string;
  url?: string;
  note?: string;
  platforms?: string[];
}

interface INativeComponent {
  id: string;
  name: string;
  url: string;
  license: string;
  copyright: string | null;
  note?: string;
  licenseNotice?: string;
  lgplNotice?: boolean;
  platforms: string[];
  pods: string[];
  gradle: string[];
}

interface INativeManifest {
  reactNativePodPrefixes: string[];
  podToNpm: Record<string, string>;
  gradleToNpm: Record<string, string>;
  components: INativeComponent[];
  fonts: { id: string; name: string; url: string; license: string; copyright: string }[];
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function resolvePackageDir(fromDir: string, name: string): string | undefined {
  let dir = fromDir;
  for (;;) {
    const candidate = path.join(dir, "node_modules", name);
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir || !dir.startsWith(root)) {
      return undefined;
    }
    dir = parent;
  }
}

function normalizeLicense(pkg: { license?: unknown; licenses?: unknown }): string {
  const license = pkg.license;
  if (typeof license === "string") {
    return license;
  }
  if (license && typeof license === "object" && "type" in license) {
    return String((license as { type: unknown }).type);
  }
  if (Array.isArray(pkg.licenses)) {
    return pkg.licenses.map((l) => (typeof l === "string" ? l : l.type)).join(" OR ");
  }
  return "UNKNOWN";
}

// "(MIT OR Apache-2.0)" grants a choice; we take the first branch and reproduce that text.
function canonicalName(license: string): string {
  const chosen = license
    .replace(/^\(|\)$/g, "")
    .split(/\s+OR\s+/i)[0]
    .trim();
  const map: Record<string, string> = {
    MIT: "MIT",
    ISC: "ISC",
    "BSD-2-Clause": "BSD-2-Clause",
    "BSD-3-Clause": "BSD-3-Clause",
    BSD: "BSD-3-Clause",
    "Apache-2.0": "Apache-2.0",
    Apache: "Apache-2.0",
    "0BSD": "0BSD",
    Zlib: "Zlib",
    zlib: "Zlib",
    "BSL-1.0": "BSL-1.0",
    "OFL-1.1": "OFL-1.1",
    "LGPL-2.1-or-later": "LGPL-2.1",
    "LGPL-2.1": "LGPL-2.1",
  };
  return map[chosen] || chosen;
}

function canonicalText(license: string, copyright?: string | null): string {
  const file = path.join(canonicalDir, `${canonicalName(license)}.txt`);
  if (!fs.existsSync(file)) {
    return "";
  }
  const text = fs.readFileSync(file, "utf8");
  return text.replace("{{COPYRIGHT}}", copyright || "");
}

function authorOf(pkg: { author?: unknown }): string | undefined {
  const author = pkg.author;
  if (typeof author === "string") {
    return author
      .replace(/\s*<[^>]*>/g, "")
      .replace(/\s*\([^)]*\)/g, "")
      .trim();
  }
  if (author && typeof author === "object" && "name" in author) {
    return String((author as { name: unknown }).name);
  }
  return undefined;
}

function extractCopyright(text: string): string | undefined {
  const line = text.split(/\r?\n/).find((l) => /copyright\s+(\(c\)|©|\d{4})/i.test(l));
  return line ? line.trim() : undefined;
}

function readLicenseText(dir: string): string | undefined {
  let files: string[];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return undefined;
  }
  const match = files.find((f) => /^(LICEN[CS]E|COPYING|UNLICENSE)/i.test(f));
  if (!match) {
    return undefined;
  }
  const stat = fs.statSync(path.join(dir, match));
  if (stat.isDirectory()) {
    return undefined;
  }
  return fs.readFileSync(path.join(dir, match), "utf8").trim();
}

function packageDirsFromMap(file: string): string[] {
  const map = readJson<{ sources?: string[] }>(file);
  const dirs = new Set<string>();
  for (const source of map.sources || []) {
    const index = source.lastIndexOf("node_modules/");
    if (index < 0) {
      continue;
    }
    const prefix = source.slice(0, index + "node_modules/".length).replace(/^.*?(?=node_modules\/)/, "");
    const rest = source.slice(index + "node_modules/".length).split("/");
    const name = rest[0].startsWith("@") ? `${rest[0]}/${rest[1]}` : rest[0];
    dirs.add(path.posix.join(prefix, name));
  }
  return [...dirs];
}

function scanMaps(): { web: string[] | undefined; native: string[] | undefined } {
  const web = new Set<string>();
  let sawWeb = false;
  for (const dir of WEB_MAP_DIRS) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) {
      continue;
    }
    for (const file of fs.readdirSync(abs).filter((f) => f.endsWith(".map"))) {
      sawWeb = true;
      packageDirsFromMap(path.join(abs, file)).forEach((d) => web.add(d));
    }
  }

  const native = new Set<string>();
  let sawNative = false;
  for (const rel of NATIVE_MAPS) {
    const abs = path.join(root, rel);
    if (fs.existsSync(abs)) {
      sawNative = true;
      packageDirsFromMap(abs).forEach((d) => native.add(d));
    }
  }

  return {
    web: sawWeb ? [...web].sort() : undefined,
    native: sawNative ? [...native].sort() : undefined,
  };
}

// Each platform's list is refreshed only when that platform's bundles are present, so a
// web-only build doesn't silently drop every native-only package off the page.
function shippedPackageDirs(): string[] {
  const cache: { web: string[]; native: string[] } = fs.existsSync(CACHE_PATH)
    ? readJson(CACHE_PATH)
    : { web: [], native: [] };
  const scanned = scanMaps();

  if (scanned.web == null && cache.web.length === 0) {
    throw new Error(
      `No web bundle source maps found under ${WEB_MAP_DIRS.join(", ")} and no cached list in ` +
        `${path.relative(root, CACHE_PATH)}. Run "npm run build:dev" first.`
    );
  }

  const next = { web: scanned.web ?? cache.web, native: scanned.native ?? cache.native };
  if (scanned.web != null || scanned.native != null) {
    fs.writeFileSync(CACHE_PATH, `${JSON.stringify(next, null, 2)}\n`);
  }
  if (scanned.native == null) {
    console.warn(
      `Warning: no React Native bundle maps found (${NATIVE_MAPS.join(", ")}); ` +
        `reusing the cached native package list. Run scripts/build-rn-bundle.sh to refresh it.`
    );
  }

  return [...new Set([...next.web, ...next.native])].sort();
}

function collectNpmEntries(): { entries: IEntry[]; packages: Map<string, string> } {
  const entries: IEntry[] = [];
  const dirs = new Map<string, string>();
  const missing: string[] = [];

  for (const relDir of shippedPackageDirs()) {
    const dir = path.join(root, relDir);
    if (!fs.existsSync(path.join(dir, "package.json"))) {
      missing.push(relDir);
      continue;
    }
    const pkg = readJson<Record<string, unknown>>(path.join(dir, "package.json"));
    const license = normalizeLicense(pkg);
    const fileText = readLicenseText(dir);
    const copyright =
      (fileText ? extractCopyright(fileText) : undefined) ||
      (authorOf(pkg) ? `Copyright (c) ${authorOf(pkg)}` : undefined);
    const text = fileText || canonicalText(license, copyright) || "";

    entries.push({
      name: String(pkg.name),
      version: String(pkg.version),
      license,
      copyright,
      text: text.trim(),
    });
    dirs.set(String(pkg.name), dir);
  }

  if (missing.length > 0) {
    console.warn(
      `Warning: ${missing.length} package(s) appear in the cached bundle list but are no longer ` +
        `installed, so they were skipped: ${missing.join(", ")}`
    );
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));
  return { entries, packages: dirs };
}

function podNames(): string[] {
  const lockPath = path.join(root, "ios", "Podfile.lock");
  if (!fs.existsSync(lockPath)) {
    return [];
  }
  const lock = fs.readFileSync(lockPath, "utf8");
  const section = lock.split(/^PODS:/m)[1]?.split(/^DEPENDENCIES:/m)[0] || "";
  const names = section
    .split(/\r?\n/)
    .filter((l) => /^ {2}- /.test(l))
    .map(
      (l) =>
        l
          .replace(/^ {2}- /, "")
          .replace(/ \(.*/, "")
          .replace(/"/g, "")
          .split("/")[0]
    );
  return [...new Set(names)].sort();
}

function gradleCoordinates(npmDirs: Map<string, string>): string[] {
  const files = [path.join(root, "android", "app", "build.gradle")];
  for (const dir of npmDirs.values()) {
    const gradle = path.join(dir, "android", "build.gradle");
    if (fs.existsSync(gradle)) {
      files.push(gradle);
    }
  }
  const coordinates = new Set<string>();
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const line of content.split(/\r?\n/)) {
      if (/^\s*(\/\/|\*)/.test(line)) {
        continue;
      }
      const match = /^\s*(?:implementation|api|compileOnly|runtimeOnly)\s*\(?\s*["']([^"']+)["']/.exec(line);
      if (match == null) {
        continue;
      }
      const coordinate = match[1];
      if (coordinate.includes("$") && coordinate.split(":").length < 2) {
        continue;
      }
      coordinates.add(coordinate.split(":").slice(0, 2).join(":"));
    }
  }
  return [...coordinates].sort();
}

// A pod or Gradle artifact can ship native code even when none of its JavaScript ends up
// in a bundle, so those packages have to be pulled in by name rather than via the maps.
function addNativeOnlyPackages(manifest: INativeManifest, entries: IEntry[], npmDirs: Map<string, string>): void {
  const targets = [...Object.values(manifest.podToNpm), ...Object.values(manifest.gradleToNpm)];
  for (const name of [...new Set(targets)]) {
    if (npmDirs.has(name)) {
      continue;
    }
    const dir = resolvePackageDir(root, name);
    if (dir == null) {
      throw new Error(
        `scripts/licenses/native.json maps a native dependency to npm package "${name}", ` +
          `which is not installed. Fix the mapping or install the package.`
      );
    }
    const pkg = readJson<Record<string, unknown>>(path.join(dir, "package.json"));
    const license = normalizeLicense(pkg);
    const fileText = readLicenseText(dir);
    const copyright =
      (fileText ? extractCopyright(fileText) : undefined) ||
      (authorOf(pkg) ? `Copyright (c) ${authorOf(pkg)}` : undefined);
    entries.push({
      name: String(pkg.name),
      version: String(pkg.version),
      license,
      copyright,
      text: (fileText || canonicalText(license, copyright) || "").trim(),
      note: "native code only",
    });
    npmDirs.set(String(pkg.name), dir);
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
}

function verifyNativeCoverage(manifest: INativeManifest, npmDirs: Map<string, string>): void {
  const missing: string[] = [];

  for (const pod of podNames()) {
    const isReactNative = manifest.reactNativePodPrefixes.some((p) => pod.startsWith(p));
    const mapped = manifest.podToNpm[pod];
    const component = manifest.components.some((c) => c.pods.includes(pod));
    if (!isReactNative && mapped == null && !component) {
      missing.push(`pod: ${pod}`);
    }
  }

  for (const coordinate of gradleCoordinates(npmDirs)) {
    const mapped = manifest.gradleToNpm[coordinate];
    const component = manifest.components.some((c) => c.gradle.some((g) => coordinate.startsWith(g)));
    if (mapped == null && !component) {
      missing.push(`gradle: ${coordinate}`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Native dependencies missing from scripts/licenses/native.json:\n  ${missing.join("\n  ")}\n\n` +
        `Add them there (with license + copyright) so they appear on the licenses page.`
    );
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function groupByText(entries: IEntry[]): { entries: IEntry[]; license: string; text: string }[] {
  const groups = new Map<string, { entries: IEntry[]; license: string; text: string }>();
  for (const entry of entries) {
    const key = `${entry.license} ${entry.text.replace(/\s+/g, " ").trim()}`;
    const existing = groups.get(key);
    if (existing) {
      existing.entries.push(entry);
    } else {
      groups.set(key, { entries: [entry], license: entry.license, text: entry.text });
    }
  }
  return [...groups.values()].sort((a, b) => b.entries.length - a.entries.length);
}

function renderGroup(group: { entries: IEntry[]; license: string; text: string }): string {
  const names = group.entries
    .map((e) => {
      const label = e.version ? `${e.name} ${e.version}` : e.name;
      return `<li>${escapeHtml(label)}${e.note ? ` <span class="note">${escapeHtml(e.note)}</span>` : ""}</li>`;
    })
    .join("\n");
  return `
    <section class="group">
      <h3>${escapeHtml(group.license)}</h3>
      <ul class="pkgs">
${names}
      </ul>
      <pre>${escapeHtml(group.text)}</pre>
    </section>`;
}

function build(): void {
  const manifest = readJson<INativeManifest>(path.join(__dirname, "licenses", "native.json"));
  const { entries: npmEntries, packages: npmDirs } = collectNpmEntries();
  addNativeOnlyPackages(manifest, npmEntries, npmDirs);
  verifyNativeCoverage(manifest, npmDirs);

  const fontEntries: IEntry[] = manifest.fonts.map((f) => ({
    name: f.name,
    license: f.license,
    copyright: f.copyright,
    url: f.url,
    text: `${f.copyright}\n\n${canonicalText(f.license)}`.trim(),
  }));

  const nativeEntries: IEntry[] = manifest.components.map((c) => {
    const notice = c.licenseNotice ? `${c.licenseNotice}\n\n` : "";
    const body = c.license === "Proprietary" ? "" : canonicalText(c.license, c.copyright);
    const header = c.copyright ? `${c.copyright}\n\n` : "";
    return {
      name: c.name,
      license: c.license,
      copyright: c.copyright || undefined,
      url: c.url,
      note: c.note,
      platforms: c.platforms,
      text: `${header}${notice}${body}`.trim() || `${header}${notice}`.trim(),
    };
  });

  const licenseCounts = new Map<string, number>();
  for (const e of [...npmEntries, ...nativeEntries, ...fontEntries]) {
    licenseCounts.set(e.license, (licenseCounts.get(e.license) || 0) + 1);
  }
  const summary = [...licenseCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([license, count]) => `<li><strong>${escapeHtml(license)}</strong> — ${count}</li>`)
    .join("\n");

  const lgpl = manifest.components.find((c) => c.lgplNotice);
  const lgplSection =
    lgpl == null
      ? ""
      : `
    <section class="callout">
      <h2>LGPL notice — ${escapeHtml(lgpl.name)}</h2>
      <p>
        The Android app links against <a href="${escapeHtml(lgpl.url)}">${escapeHtml(lgpl.name)}</a>, which is
        licensed under the GNU Lesser General Public License, version 2.1 or (at your option) any later version.
        ${escapeHtml(lgpl.copyright || "")}
      </p>
      <p>
        In accordance with section 6 of that license, the complete source code of this application is published
        under the GNU Affero General Public License v3 at
        <a href="https://github.com/astashov/liftosaur">github.com/astashov/liftosaur</a>. You may modify
        ${escapeHtml(lgpl.name)}, rebuild the application against your modified version, and redistribute the
        result. The full text of the LGPL v2.1 is reproduced below.
      </p>
      <pre>${escapeHtml(canonicalText("LGPL-2.1"))}</pre>
    </section>`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Liftosaur: Licenses</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
             max-width: 52rem; margin: 0 auto; padding: 1.5rem; line-height: 1.5; color: #171717; }
      h1 { font-size: 1.6rem; }
      h2 { font-size: 1.2rem; margin-top: 2.5rem; border-bottom: 1px solid #e5e5e5; padding-bottom: 0.3rem; }
      h3 { font-size: 0.95rem; margin: 0 0 0.5rem; color: #525252; }
      pre { background: #f5f5f5; padding: 0.75rem; overflow-x: auto; white-space: pre-wrap;
            word-wrap: break-word; font-size: 0.75rem; line-height: 1.4; border-radius: 4px; }
      ul.pkgs { columns: 2; font-size: 0.8rem; padding-left: 1.1rem; margin: 0 0 0.6rem; }
      ul.pkgs li { break-inside: avoid; }
      .group { margin-bottom: 2rem; }
      .note { color: #737373; font-style: italic; }
      .callout { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 1rem; margin-top: 2rem; }
      .callout h2 { margin-top: 0; border: none; }
      .summary { font-size: 0.9rem; }
      .generated { color: #737373; font-size: 0.8rem; }
      @media (prefers-color-scheme: dark) {
        body { background: #171717; color: #e5e5e5; }
        pre { background: #262626; }
        h2 { border-color: #404040; }
        h3, .note, .generated { color: #a3a3a3; }
        .callout { background: #292524; border-color: #78716c; }
        a { color: #93c5fd; }
      }
    </style>
  </head>
  <body>
    <h1>Open source licenses</h1>
    <p class="summary">
      Liftosaur is itself open source, licensed under the
      <a href="https://github.com/astashov/liftosaur/blob/master/LICENSE">GNU Affero General Public License v3</a>.
      It is built on the third-party components listed below, and this page reproduces their copyright notices and
      license texts as those licenses require.
    </p>
    <p class="generated">This page is generated by <code>scripts/build-licenses.ts</code>; do not edit it by hand.</p>

    <h2>Summary</h2>
    <ul class="summary">
${summary}
    </ul>
${lgplSection}

    <h2>Fonts</h2>
${groupByText(fontEntries).map(renderGroup).join("\n")}

    <h2>Native libraries (iOS and Android)</h2>
${groupByText(nativeEntries).map(renderGroup).join("\n")}

    <h2>JavaScript packages</h2>
${groupByText(npmEntries).map(renderGroup).join("\n")}
  </body>
</html>
`;

  const outPath = path.join(root, "src", "licenses.html");
  fs.writeFileSync(outPath, html);

  // This runs after webpack, which has already copied the previous src/licenses.html into
  // dist, so the freshly generated one has to overwrite it there too.
  const distPath = path.join(root, "dist", "licenses.html");
  if (fs.existsSync(path.dirname(distPath))) {
    fs.writeFileSync(distPath, html);
  }

  const total = npmEntries.length + nativeEntries.length + fontEntries.length;
  console.log(
    `Wrote ${outPath}: ${npmEntries.length} npm packages, ${nativeEntries.length} native components, ` +
      `${fontEntries.length} fonts (${total} total, ${Math.round(html.length / 1024)}kb)`
  );

  const noText = npmEntries.filter((e) => e.text.length === 0);
  if (noText.length > 0) {
    throw new Error(
      `No license text resolved for:\n  ${noText.map((e) => `${e.name}@${e.version} (${e.license})`).join("\n  ")}\n\n` +
        `Add a canonical text under scripts/licenses/canonical/ for those SPDX ids.`
    );
  }
}

build();
