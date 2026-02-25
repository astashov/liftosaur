import { Utils_getEnv } from "../utils";

export const LftS3Buckets = {
  caches: "liftosaurcaches2",
  stats: "liftosaurstats",
  debugs: "liftosaurdebugs2",
  exceptions: "liftosaurexceptions2",
  storages: "liftosaurstorages",
  programs: "liftosaurprograms",
  assets: "liftosaurassets",
  images: "liftosaurimages2",
  userimages: "liftosauruserimages",
};

export function getUserImagesPrefix(): string {
  const env = Utils_getEnv();
  if (env === "dev") {
    return "https://stage.liftosaur.com/userimages/";
  } else {
    return "https://www.liftosaur.com/userimages/";
  }
}
