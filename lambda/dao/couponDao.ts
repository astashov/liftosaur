import { Utils } from "../utils";
import { IDI } from "../utils/di";
import { UidFactory } from "../utils/generator";

export const couponsTableNames = {
  dev: {
    coupons: "lftCouponsDev",
  },
  prod: {
    coupons: "lftCoupons",
  },
} as const;

export interface ICouponData {
  apple: {
    monthly: {
      offerId: string;
      productId: string;
    };
    yearly: {
      offerId: string;
      productId: string;
    };
  };
  google: {
    monthly: {
      offerId: string;
      productId: string;
    };
    yearly: {
      offerId: string;
      productId: string;
    };
  };
}

export interface ICouponDao {
  code: string;
  ttlMs: number;
  isClaimed: boolean;
  info?: string;
  applePromotionalOfferIdMonthly?: string;
  appleProductIdMonthly?: string;
  applePromotionalOfferIdYearly?: string;
  appleProductIdYearly?: string;
  googlePromotionalOfferIdMonthly?: string;
  googleProductIdMonthly?: string;
  googlePromotionalOfferIdYearly?: string;
  googleProductIdYearly?: string;
}

export class CouponDao {
  constructor(private readonly di: IDI) {}

  public async get(code: string): Promise<ICouponDao | undefined> {
    const env = Utils.getEnv();
    const coupon = await this.di.dynamo.get<ICouponDao>({
      tableName: couponsTableNames[env].coupons,
      key: { code: code.toLowerCase() },
    });
    return coupon;
  }

  public async claim(coupon: ICouponDao): Promise<ICouponDao | undefined> {
    const env = Utils.getEnv();
    coupon.isClaimed = true;
    await this.di.dynamo.put({
      tableName: couponsTableNames[env].coupons,
      item: coupon,
    });
    return coupon;
  }

  public getData(coupon: ICouponDao): ICouponData | undefined {
    const applePromotionalOfferIdMonthly = coupon.applePromotionalOfferIdMonthly;
    const appleProductIdMonthly = coupon.appleProductIdMonthly;
    const applePromotionalOfferIdYearly = coupon.applePromotionalOfferIdYearly;
    const appleProductIdYearly = coupon.appleProductIdYearly;
    const googlePromotionalOfferIdMonthly = coupon.googlePromotionalOfferIdMonthly;
    const googleProductIdMonthly = coupon.googleProductIdMonthly;
    const googlePromotionalOfferIdYearly = coupon.googlePromotionalOfferIdYearly;
    const googleProductIdYearly = coupon.googleProductIdYearly;
    if (
      !applePromotionalOfferIdMonthly ||
      !appleProductIdMonthly ||
      !applePromotionalOfferIdYearly ||
      !appleProductIdYearly ||
      !googlePromotionalOfferIdMonthly ||
      !googleProductIdMonthly ||
      !googlePromotionalOfferIdYearly ||
      !googleProductIdYearly
    ) {
      return undefined;
    }
    return {
      apple: {
        monthly: {
          offerId: applePromotionalOfferIdMonthly,
          productId: appleProductIdMonthly,
        },
        yearly: {
          offerId: applePromotionalOfferIdYearly,
          productId: appleProductIdYearly,
        },
      },
      google: {
        monthly: {
          offerId: googlePromotionalOfferIdMonthly,
          productId: googleProductIdMonthly,
        },
        yearly: {
          offerId: googlePromotionalOfferIdYearly,
          productId: googleProductIdYearly,
        },
      },
    };
  }

  public async create(ttlMs: number, info?: string, data?: ICouponData): Promise<ICouponDao> {
    const env = Utils.getEnv();
    const coupon: ICouponDao = {
      code: UidFactory.generateUid(8),
      ttlMs,
      isClaimed: false,
      info,
      applePromotionalOfferIdMonthly: data?.apple.monthly.offerId,
      appleProductIdMonthly: data?.apple.monthly.productId,
      applePromotionalOfferIdYearly: data?.apple.yearly.offerId,
      appleProductIdYearly: data?.apple.yearly.productId,
      googlePromotionalOfferIdMonthly: data?.google.monthly.offerId,
      googleProductIdMonthly: data?.google.monthly.productId,
      googlePromotionalOfferIdYearly: data?.google.yearly.offerId,
      googleProductIdYearly: data?.google.yearly.productId,
    };
    await this.di.dynamo.put({
      tableName: couponsTableNames[env].coupons,
      item: coupon,
    });
    return coupon;
  }
}
