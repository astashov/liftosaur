import { Utils } from "../utils";
import { IDI } from "../utils/di";

const tableNames = {
  dev: {
    payments: "lftPaymentsDev",
  },
  prod: {
    payments: "lftPayments",
  },
} as const;

export interface IPaymentDao {
  userId: string;
  timestamp: number;
  originalTransactionId: string;
  productId: string;
  amount: number;
  currency?: string;
  type: "apple" | "google";
  paymentType: "purchase" | "renewal" | "refund";
}

export class PaymentDao {
  constructor(private readonly di: IDI) {}

  public async add(payment: IPaymentDao): Promise<void> {
    const env = Utils.getEnv();
    await this.di.dynamo.put({
      tableName: tableNames[env].payments,
      item: payment,
    });
  }

  public async getByUserId(userId: string, limit?: number): Promise<IPaymentDao[]> {
    const env = Utils.getEnv();
    return this.di.dynamo.query<IPaymentDao>({
      tableName: tableNames[env].payments,
      expression: "userId = :userId",
      values: { ":userId": userId },
      scanIndexForward: false,
      limit,
    });
  }
}