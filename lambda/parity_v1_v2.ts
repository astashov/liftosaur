// Read-only parity harness: for a sample of real Google subscription/product tokens, fetch BOTH the
// deprecated v1 GET (inlined here) and the new v2 path, derive the entitlement row each way, and diff.
// The v1 endpoints are still live until 2028-08-31, so this can run safely against prod without writing.
//
//   npm run r ./lambda/parity_v1_v2.ts -- --limit 100        (prod)
//   npm run rd ./lambda/parity_v1_v2.ts -- --limit 100       (dev)
//
// Exit code is non-zero if any CRITICAL field (product / isActive / expires / originalTransactionId)
// diverges. isTrial/isPromo are reported as ADVISORY: v1 measured paymentState/promotionType while v2
// measures offer tags, so they legitimately differ — this run is also how you confirm the freetrial/promo
// offerTags actually appear in v2 payloads.
import fetch from "node-fetch";
import JWT from "jsonwebtoken";
import { buildDi } from "./utils/di";
import { LogUtil } from "./utils/log";
import { SubscriptionDetailsDao } from "./dao/subscriptionDetailsDao";
import { Subscriptions } from "./utils/subscriptions";

const GOOGLE_PRODUCT_IDS: Record<string, string> = {
  montly: "com.liftosaur.subscription.and_montly",
  yearly: "com.liftosaur.subscription.and_yearly",
  lifetime: "com.liftosaur.subscription.and_lifetime",
};

interface IDerivedRow {
  product?: string;
  isActive?: boolean;
  expires?: number;
  isTrial?: boolean;
  isPromo?: boolean;
  originalTransactionId?: string;
}

function getArg(name: string, def: number): number {
  const idx = process.argv.indexOf(name);
  return idx !== -1 && process.argv[idx + 1] != null ? parseInt(process.argv[idx + 1], 10) : def;
}

async function signJwt(privateKey: string, clientEmail: string): Promise<string> {
  return JWT.sign(
    {
      iss: clientEmail,
      sub: clientEmail,
      aud: "https://androidpublisher.googleapis.com/",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    privateKey,
    { algorithm: "RS256" }
  );
}

// Inlined copy of the deleted v1 GET + mapping, kept ONLY in this throwaway harness for comparison.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchV1(jwt: string, token: string, productId: string): Promise<any | undefined> {
  const base = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.liftosaur.www.twa";
  const url =
    productId.indexOf("lifetime") !== -1
      ? `${base}/purchases/products/${productId}/tokens/${token}`
      : `${base}/purchases/subscriptions/${productId}/tokens/${token}`;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` } });
    return await res.json();
  } catch (e) {
    return undefined;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deriveV1(json: any, token: string): IDerivedRow | undefined {
  if (!json || "error" in json) {
    return undefined;
  }
  if (json.kind === "androidpublisher#productPurchase") {
    return {
      product: "lifetime",
      expires: 4105144800000,
      isTrial: false,
      isPromo: false,
      isActive: json.purchaseState === 0 && json.acknowledgementState === 1,
      originalTransactionId: token,
    };
  }
  return {
    product: Number(json.priceAmountMicros || "0") > 100000000 ? "yearly" : "montly",
    expires: Number(json.expiryTimeMillis || "0"),
    isTrial: json.paymentState === 2,
    isPromo: json.promotionType === 0 || json.promotionType === 1,
    isActive: json.cancelReason == null && Number(json.expiryTimeMillis || "0") > Date.now(),
    originalTransactionId: json.linkedPurchaseToken || token,
  };
}

async function deriveV2(
  subscriptions: Subscriptions,
  token: string,
  productId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ row?: IDerivedRow; offerTags?: string[]; pendingProduct?: string; raw?: any }> {
  if (productId.indexOf("lifetime") !== -1) {
    const json = await subscriptions.getGoogleProductV2(token);
    if (!json || !json.purchaseStateContext) {
      return { raw: json };
    }
    const info = subscriptions.getGoogleProductVerificationInfoV2("parity", json, token);
    return { row: info && { ...info }, raw: json };
  }
  const json = await subscriptions.getGoogleSubscriptionV2(token);
  if (!json || (json.lineItems || []).length === 0) {
    return { raw: json };
  }
  const orderAmount = await subscriptions.getGoogleCurrentOrderAmount(
    subscriptions.getGoogleSubscriptionSuccessfulOrderId(json)
  );
  const info = subscriptions.getGoogleVerificationInfoV2("parity", json, token, orderAmount);
  const offerTags = (json.lineItems || []).flatMap((li) => li.offerDetails?.offerTags || []);
  return { row: info && { ...info }, offerTags, pendingProduct: info?.pendingProduct, raw: json };
}

async function main(): Promise<void> {
  const limit = getArg("--limit", 50);
  const debugN = getArg("--debug", 0);
  const debugLifetime = process.argv.indexOf("--debug-lifetime") !== -1;
  let debugPrinted = 0;
  const log = new LogUtil();
  const di = buildDi(log, fetch);
  const subscriptions = new Subscriptions(di.log, di.secrets);
  const secret = await di.secrets.getGoogleServiceAccountPubsub();
  const jwt = await signJwt(secret.private_key, secret.client_email);

  // Source tokens from lftSubscriptionDetails (subscribers only) rather than scanning the whole users table.
  // originalTransactionId is a usable purchase token (the v2 path is token-only); productId comes from `product`.
  console.log(`Scanning lftSubscriptionDetails for Google subscribers (limit ${limit})...`);
  const details = await new SubscriptionDetailsDao(di).scanAll();
  const tokens = details
    .filter((d) => d.type === "google" && d.originalTransactionId && GOOGLE_PRODUCT_IDS[d.product])
    .slice(0, limit)
    .map((d) => ({ userId: d.userId, token: d.originalTransactionId!, productId: GOOGLE_PRODUCT_IDS[d.product] }));
  console.log(`Comparing ${tokens.length} tokens\n`);

  const critical: ("product" | "isActive" | "expires" | "originalTransactionId")[] = [
    "product",
    "isActive",
    "expires",
    "originalTransactionId",
  ];
  let criticalMismatches = 0;
  let advisoryMismatches = 0;
  let bothEmpty = 0;
  let offerTagsSeen = 0;
  let v1FailedV2Ok = 0; // v1 errored (e.g. stale productId after a plan switch) but v2 resolved — v2 is correct
  let v2FailedV1Ok = 0; // v2 missing but v1 had data — this IS concerning
  // Histograms of every raw enum string seen, so one run validates ALL of our hardcoded constants.
  const subStateHist: Record<string, number> = {};
  const prodStateHist: Record<string, number> = {};
  const prodAckHist: Record<string, number> = {};

  for (const { userId, token, productId } of tokens) {
    const v1raw = await fetchV1(jwt, token, productId);
    const v1 = deriveV1(v1raw, token);
    const { row: v2, offerTags, pendingProduct, raw: v2raw } = await deriveV2(subscriptions, token, productId);

    // Record raw enum strings regardless of mismatch.
    if (v2raw && typeof v2raw === "object" && !("error" in v2raw)) {
      if (v2raw.subscriptionState) {
        subStateHist[v2raw.subscriptionState] = (subStateHist[v2raw.subscriptionState] || 0) + 1;
      }
      if (v2raw.purchaseStateContext?.purchaseState) {
        const k = v2raw.purchaseStateContext.purchaseState;
        prodStateHist[k] = (prodStateHist[k] || 0) + 1;
      }
      if (productId.indexOf("lifetime") !== -1 && v2raw.acknowledgementState) {
        prodAckHist[v2raw.acknowledgementState] = (prodAckHist[v2raw.acknowledgementState] || 0) + 1;
      }
    }
    if (offerTags && offerTags.length > 0) {
      offerTagsSeen += 1;
    }

    if (!v1 && !v2) {
      bothEmpty += 1;
      continue;
    }
    if (!v1 && v2) {
      // v1 GET failed (commonly a plan-switcher: stale productId in the v1 URL path) while v2 resolved.
      v1FailedV2Ok += 1;
      continue;
    }
    if (v1 && !v2) {
      v2FailedV1Ok += 1;
      console.log(`user ${userId} | ${productId} | token ${token.slice(0, 16)}... [v2 MISSING while v1 OK]`);
      continue;
    }

    const critDiffs = critical.filter((f) => v1?.[f] !== v2?.[f]);
    const advDiffs = (["isTrial", "isPromo"] as const).filter((f) => v1?.[f] !== v2?.[f]);

    if (critDiffs.length > 0 || advDiffs.length > 0) {
      if (critDiffs.length > 0) {
        criticalMismatches += 1;
      }
      if (advDiffs.length > 0) {
        advisoryMismatches += 1;
      }
      console.log(`user ${userId} | ${productId} | token ${token.slice(0, 16)}...`);
      for (const f of [...critDiffs, ...advDiffs]) {
        const tag = critical.indexOf(f as (typeof critical)[number]) !== -1 ? "CRITICAL" : "advisory";
        console.log(`  [${tag}] ${f}: v1=${JSON.stringify(v1?.[f])} v2=${JSON.stringify(v2?.[f])}`);
      }
      if (pendingProduct) {
        console.log(`  (v2 pendingProduct: ${pendingProduct})`);
      }
      if (offerTags) {
        console.log(`  (v2 offerTags: ${JSON.stringify(offerTags)})`);
      }
      const isLifetime = productId.indexOf("lifetime") !== -1;
      const wantDump = critDiffs.length > 0 && debugPrinted < debugN && (!debugLifetime || isLifetime);
      if (wantDump) {
        console.log(`  --- RAW v1 ---\n${JSON.stringify(v1raw, null, 2)}`);
        console.log(`  --- RAW v2 ---\n${JSON.stringify(v2raw, null, 2)}`);
        debugPrinted += 1;
      }
    }
  }

  console.log(`\n=== Enum strings seen (validate against our constants) ===`);
  console.log(`subscriptionState:        ${JSON.stringify(subStateHist)}`);
  console.log(`product purchaseState:    ${JSON.stringify(prodStateHist)}`);
  console.log(`product acknowledgeState: ${JSON.stringify(prodAckHist)}`);

  console.log(`\n=== Parity Results ===`);
  console.log(`Tokens compared:        ${tokens.length}`);
  console.log(`Both empty/not-found:   ${bothEmpty}`);
  console.log(`v1 failed, v2 OK:       ${v1FailedV2Ok}  (expected: plan-switchers; v2 is correct)`);
  console.log(`v2 missing, v1 OK:      ${v2FailedV1Ok}  (concerning if > 0)`);
  console.log(`Tokens w/ offerTags:    ${offerTagsSeen}`);
  console.log(`CRITICAL mismatches:    ${criticalMismatches}  (both returned data and disagree)`);
  console.log(`Advisory (trial/promo): ${advisoryMismatches}  (offer-tag vs paymentState — expected to differ)`);
  const blocking = criticalMismatches + v2FailedV1Ok;
  if (blocking > 0) {
    console.log(`\nSTOP-SHIP: ${blocking} blocking divergence(s). Investigate before releasing.`);
    process.exit(1);
  }
  console.log(`\nOK: no blocking divergence.`);
}

main();
