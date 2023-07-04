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

export interface ICouponDao {
  code: string;
  ttlMs: number;
  isClaimed: boolean;
  info?: string;
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

  public async create(ttlMs: number, info?: string): Promise<ICouponDao> {
    const env = Utils.getEnv();
    const coupon: ICouponDao = {
      code: UidFactory.generateUid(8),
      ttlMs,
      isClaimed: false,
      info,
    };
    await this.di.dynamo.put({
      tableName: couponsTableNames[env].coupons,
      item: coupon,
    });
    return coupon;
  }
}
