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
  transactionId: string;
  productId: string;
  amount: number;
  currency?: string;
  type: "apple" | "google";
  source: "verifier" | "webhook";
  paymentType: "purchase" | "renewal" | "refund";
  isFreeTrialPayment: boolean;
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

  public async doesExist(transactionId: string): Promise<boolean> {
    const env = Utils.getEnv();
    const existingPayments = await this.di.dynamo.query<IPaymentDao>({
      tableName: tableNames[env].payments,
      indexName: `lftPaymentsTransactionId${env === "dev" ? "Dev" : ""}`,
      expression: "transactionId = :transactionId",
      values: { ":transactionId": transactionId },
      limit: 1,
    });

    return existingPayments.length > 0;
  }

  public async addIfNotExists(payment: IPaymentDao): Promise<boolean> {
    if (await this.doesExist(payment.transactionId)) {
      return false;
    }
    await this.add(payment);
    return true;
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

  public async getAllPayments(): Promise<IPaymentDao[]> {
    const env = Utils.getEnv();
    return this.di.dynamo.scan<IPaymentDao>({
      tableName: tableNames[env].payments,
    });
  }
}
