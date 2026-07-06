import fetch from "node-fetch";

// Search gymvisual.com for exercise images to buy for the app catalog.
//
// gymvisual often names exercises differently than we do, so finding the right image by hand is slow.
// This queries gymvisual's PrestaShop search across one or more synonym terms, dedupes, and prints
// candidates grouped by exercise. Only the `illustrations` category yields the transparent multi-pose
// PNGs that src/imageExtractorGymVisual.ts can crop — those are listed first; exercises that exist only
// as animated-gif/video (not extractable) are flagged so you don't buy the wrong format.
//
// Usage (run ts-node directly, NOT `npm run r` — npm strips quotes, mangling multi-word terms):
//   npx ts-node ./scripts/gymvisual_search.ts "nordic curl" "hamstring curl" "glute ham"
//   npx ts-node ./scripts/gymvisual_search.ts --max=60 --all "l-sit"
//
// Flags:
//   --max=N   max results to scan per term (default 40, i.e. 2 pages of 20)
//   --all     also list exercises that have no illustration (gif/video only)

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

const CATEGORIES = ["illustrations", "animated-gifs", "videos"] as const;
type ICategory = (typeof CATEGORIES)[number];

interface IHit {
  category: ICategory;
  productId: string;
  title: string;
  url: string;
  image?: string;
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return m ? m[1] : undefined;
}

// Collapse a title to a comparison key so the illustration/gif/video variants of the same
// exercise (and (male)/(female) variants) group into one row.
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\((male|female)\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseHits(html: string): IHit[] {
  const hits: IHit[] = [];
  const blocks = html.split(/<div class="product-container/).slice(1);
  for (const block of blocks) {
    const anchorMatch = block.match(/<a class="product-name"[^>]*>/i);
    if (!anchorMatch) continue;
    const href = attr(anchorMatch[0], "href");
    const title = attr(anchorMatch[0], "title");
    if (!href || !title) continue;
    const urlMatch = href.match(/\/(illustrations|animated-gifs|videos)\/(\d+)-[^"?]+\.html/i);
    if (!urlMatch) continue;
    const imageMatch = block.match(/https:\/\/gymvisual\.com\/\d+-[a-z_]+\/[^"'\s]+\.(?:jpg|png)/i);
    hits.push({
      category: urlMatch[1] as ICategory,
      productId: urlMatch[2],
      title: decodeEntities(title).trim(),
      url: `https://gymvisual.com${urlMatch[0]}`,
      image: imageMatch ? imageMatch[0].replace(/-(small|cart|home|medium)_default\//, "-large_default/") : undefined,
    });
  }
  return hits;
}

async function searchTerm(term: string, max: number): Promise<IHit[]> {
  const perPage = 20;
  const hits: IHit[] = [];
  for (let page = 1; hits.length < max; page += 1) {
    const url =
      `https://gymvisual.com/search?controller=search&submit_search=&search_query=${encodeURIComponent(term)}` +
      (page > 1 ? `&p=${page}` : "");
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) {
      console.error(`  ! "${term}" page ${page}: ${res.status} ${res.statusText}`);
      break;
    }
    const pageHits = parseHits(await res.text());
    if (pageHits.length === 0) break;
    hits.push(...pageHits);
    if (pageHits.length < perPage) break;
  }
  return hits.slice(0, max);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const showAll = args.includes("--all");
  const maxArg = args.find((a) => a.startsWith("--max="));
  const max = maxArg ? parseInt(maxArg.split("=")[1], 10) : 40;
  const terms = args.filter((a) => !a.startsWith("--"));
  if (terms.length === 0) {
    console.error('Usage: npx ts-node ./scripts/gymvisual_search.ts [--max=N] [--all] "term" ["term2" ...]');
    process.exit(1);
  }

  const byId = new Map<string, IHit>();
  for (const term of terms) {
    console.error(`Searching "${term}" ...`);
    for (const hit of await searchTerm(term, max)) {
      byId.set(`${hit.category}:${hit.productId}`, hit);
    }
  }

  const groups = new Map<string, IHit[]>();
  for (const hit of byId.values()) {
    const key = normalizeTitle(hit.title);
    const list = groups.get(key) || [];
    list.push(hit);
    groups.set(key, list);
  }

  const rows = Array.from(groups.values()).sort((a, b) => a[0].title.localeCompare(b[0].title));
  const withIllustration = rows.filter((r) => r.some((h) => h.category === "illustrations"));
  const withoutIllustration = rows.filter((r) => !r.some((h) => h.category === "illustrations"));

  const printRow = (variants: IHit[]): void => {
    const illustration = variants.find((h) => h.category === "illustrations");
    const primary = illustration || variants[0];
    const formats = CATEGORIES.filter((c) => variants.some((h) => h.category === c)).join(", ");
    console.log(`\n▸ ${primary.title}   [${formats}]`);
    if (illustration) {
      console.log(`  illustration: ${illustration.url}`);
      if (illustration.image) console.log(`  preview:      ${illustration.image}`);
    } else {
      console.log(`  (no illustration — not extractable) ${primary.url}`);
    }
  };

  console.log(`\n=== Illustrations (extractable) — ${withIllustration.length} exercises ===`);
  withIllustration.forEach(printRow);

  if (showAll && withoutIllustration.length > 0) {
    console.log(`\n=== Only gif/video (NOT extractable) — ${withoutIllustration.length} exercises ===`);
    withoutIllustration.forEach(printRow);
  } else if (withoutIllustration.length > 0) {
    console.log(`\n(${withoutIllustration.length} more exercises exist only as gif/video — pass --all to list them)`);
  }
}

main();
