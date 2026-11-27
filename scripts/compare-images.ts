import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import { DocImages_key, IDocImageSizes } from "../src/utils/docImages";

const root = path.resolve(__dirname, "..");
const imagesDir = path.join(root, "images/compare");
const sizesFile = path.join(root, "docs/compare/screenshots.json");
const maxWidth = 720;

async function convert(articleId: string, srcDir: string): Promise<void> {
  const target = path.join(imagesDir, articleId);
  fs.mkdirSync(target, { recursive: true });
  for (const file of fs.readdirSync(srcDir).filter((f) => /\.(png|jpe?g)$/i.test(f))) {
    const name = path.basename(file, path.extname(file));
    await sharp(path.join(srcDir, file))
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(target, `${name}.webp`));
  }
}

async function rebuildSizes(): Promise<void> {
  const sizes: IDocImageSizes = {};
  const articles = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir) : [];
  for (const articleId of articles.sort()) {
    const dir = path.join(imagesDir, articleId);
    for (const file of fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".webp"))
      .sort()) {
      const { width, height } = await sharp(path.join(dir, file)).metadata();
      if (width != null && height != null) {
        sizes[DocImages_key(articleId, path.basename(file, ".webp"))] = { width, height };
      }
    }
  }
  fs.writeFileSync(sizesFile, JSON.stringify(sizes, null, 2) + "\n");
}

async function main(): Promise<void> {
  const [articleId, srcDir] = process.argv.slice(2);
  if (articleId != null && srcDir != null) {
    await convert(articleId, path.resolve(srcDir));
  }
  await rebuildSizes();
}

main();
