---
name: affiliate-coupon
description: Create a 30%-off coupon for an affiliate or creator on iOS and Android, and draft the reply that tells them how to use it. Use when asked to create, set up or send a coupon or promo code for an affiliate, influencer or creator.
argument-hint: <CODE> <AFFILIATE_ID>
---

# Affiliate coupon

Create the coupon: $ARGUMENTS

## How redemption works

- iOS: "Redeem coupon" opens Apple's own code sheet (`Thunk_redeemCouponIOS`). The code must be an App Store Connect offer code. Our server is never called.
- Android: "Redeem coupon" opens our `couponModal`, which calls `/api/coupon/claim/:code` and reads the `lftCoupons` row. The claim response carries `affiliate`, and the app records it with `Storage_setAffiliate(affiliate, "coupon")`.
- An Apple custom code belongs to one offer, and an offer covers one plan. So iOS gets two codes: `<CODE>` for yearly and `<CODE>MONTHLY` for monthly. Android uses `<CODE>` for both plans.
- Apple offer names must be unique across both subscriptions. The script names them `<AFFILIATE_ID>` (yearly) and `<AFFILIATE_ID>-monthly`.
- iOS redemptions never write an `lftAffiliates` row, so the affiliate dashboard does not count them. Apple reports the offer on the payment as `offerIdentifier`.
- Program imports are counted when the link carries `?s=<AFFILIATE_ID>`.

## Steps

1. Pick the values. `CODE` is 3 to 20 letters or digits, usually the creator's name in capitals. `AFFILIATE_ID` is a short lowercase id. Use the same id for the coupon and for the program link.
2. Dry run. `--dry-run` does not work, because `npm run` takes that flag for itself. Use the env var:
   `DRY_RUN=1 npm run r lambda/scripts/create_affiliate_coupon.ts <CODE> <AFFILIATE_ID>`
3. Show the dry run output to the user and wait for approval. The real run writes to App Store Connect and to the prod `lftCoupons` table, and Apple offer codes cannot be deleted through the API.
4. Run it: `npm run r lambda/scripts/create_affiliate_coupon.ts <CODE> <AFFILIATE_ID>`. A rerun skips everything that exists, so a run that failed halfway can be repeated.
5. Draft the reply to the affiliate:
   - iPhone: the "Redeem coupon" link at the bottom of the subscription screen, then enter `<CODE>` for 30% off yearly, or `<CODE>MONTHLY` for 30% off monthly.
   - Android: the same button, enter `<CODE>`, then pick a plan.
   - The user must sign in before redeeming on Android.
   - Program link: share the program, then add `?s=<AFFILIATE_ID>` to the link.

## Files

- `lambda/scripts/create_affiliate_coupon.ts` runs the whole flow.
- `lambda/scripts/appleOfferCodes.ts` calls the App Store Connect API with `lambda/scripts/AuthKey_F286YBUYZ7.p8`. Price points are cached in `pricepointscache/`. Target prices come from `lambda/scripts/apple_prices.csv`.
- The Android offers (`monthly-discount-30`, `yearly-discount-30`) already exist in Google Play. Nothing is created there.
