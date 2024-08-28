import fs from "fs";
import { programOrder } from "../lambda/dao/programDao";
import { Exercise } from "./models/exercise";
import { buildExerciseUrl } from "./pages/exercise/exerciseContent";
const blogposts = JSON.parse(fs.readFileSync("blog/blog-posts.json", { encoding: "utf-8" }));

const staticUrls = [
  "https://www.liftosaur.com",
  "https://www.liftosaur.com/app",
  "https://www.liftosaur.com/docs",
  "https://www.liftosaur.com/blog",
  "https://www.liftosaur.com/exercises",
  "https://www.liftosaur.com/planner",
  "https://www.liftosaur.com/privacy.html",
  "https://www.liftosaur.com/terms.html",
  ...blogposts.data.map((post: string) => `https://www.liftosaur.com/blog${post}`),
  ...programOrder.map((program: string) => `https://www.liftosaur.com/programs/${program}`),
  ...Exercise.allExpanded({}).map((e) => `https://www.liftosaur.com${buildExerciseUrl(e, [])}`),
];

fs.writeFileSync("src/sitemap.txt", staticUrls.join("\n"), { encoding: "utf-8" });
