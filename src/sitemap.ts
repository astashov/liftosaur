import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { Exercise_allExpanded, Exercise_toKey } from "./models/exercise";
import { buildExerciseUrl } from "./pages/exercise/exerciseContent";
import { MathUtils_toWord } from "./utils/math";
import { parseDocMarkdown } from "./utils/docUtils";
const blogposts = JSON.parse(fs.readFileSync("blog/blog-posts.json", { encoding: "utf-8" }));
const programIndex: { id: string; dateModified?: string }[] = JSON.parse(
  fs.readFileSync("programdata/index.json", { encoding: "utf-8" })
);
const docsContentDir = path.resolve("docs/content");
const docEntries = fs.existsSync(docsContentDir)
  ? fs
      .readdirSync(docsContentDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const raw = fs.readFileSync(path.join(docsContentDir, f), "utf8");
        const { indexEntry } = parseDocMarkdown(raw);
        const lastmod = getGitLastModified(path.join("docs/content", f));
        return { id: indexEntry.id, lastmod: indexEntry.dateModified || lastmod };
      })
  : [];

function getGitLastModified(filePath: string): string | undefined {
  try {
    const date = execSync(`git log -1 --format=%aI -- "${filePath}"`, { encoding: "utf8" }).trim();
    return date || undefined;
  } catch {
    return undefined;
  }
}

interface ISitemapUrl {
  loc: string;
  lastmod?: string;
}

const urls: ISitemapUrl[] = [
  { loc: "https://www.liftosaur.com" },
  { loc: "https://www.liftosaur.com/app" },
  { loc: "https://www.liftosaur.com/doc" },
  { loc: "https://www.liftosaur.com/blog" },
  { loc: "https://www.liftosaur.com/exercises" },
  { loc: "https://www.liftosaur.com/planner" },
  { loc: "https://www.liftosaur.com/privacy.html" },
  { loc: "https://www.liftosaur.com/terms.html" },
  { loc: "https://www.liftosaur.com/affiliates" },
  { loc: "https://www.liftosaur.com/rep-max-calculator" },
  { loc: "https://www.liftosaur.com/ai/prompt" },
  ...blogposts.data.map((post: string) => {
    const slug = post.replace(/^\/posts\//, "").replace(/\/$/, "");
    const lastmod = getGitLastModified(`blog/posts/${slug}.md`);
    return { loc: `https://www.liftosaur.com/blog${post}`, ...(lastmod ? { lastmod } : {}) };
  }),
  ...programIndex.map((entry) => ({
    loc: `https://www.liftosaur.com/programs/${entry.id}`,
    ...(entry.dateModified ? { lastmod: entry.dateModified } : {}),
  })),
  ...docEntries.map((entry) => ({
    loc: `https://www.liftosaur.com/doc/${entry.id}`,
    ...(entry.lastmod ? { lastmod: entry.lastmod } : {}),
  })),
  ...Exercise_allExpanded({}).map((e) => {
    const key = Exercise_toKey(e).toLowerCase();
    const lastmod = getGitLastModified(`exercises/${key}.md`);
    return { loc: `https://www.liftosaur.com${buildExerciseUrl(e, [])}`, ...(lastmod ? { lastmod } : {}) };
  }),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((r) => ({
    loc: `https://www.liftosaur.com/${MathUtils_toWord(r)}-rep-max-calculator`,
  })),
];

const xml = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ...urls.map(
    (u) => `  <url>\n    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}\n  </url>`
  ),
  `</urlset>`,
].join("\n");

fs.writeFileSync("src/sitemap.xml", xml, { encoding: "utf-8" });
