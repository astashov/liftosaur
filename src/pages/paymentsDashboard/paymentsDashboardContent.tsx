import { JSX, useState } from "react";
import {
  IPaymentsDashboardData,
  IPaymentsDashboardUserAffiliate,
  IPaymentsSummary,
} from "../../../lambda/paymentsDashboard";
import { IPaymentDao } from "../../../lambda/dao/paymentDao";
import { StringUtils_truncate } from "../../utils/string";
import { TimeUtils_formatUTCHHMM } from "../../utils/time";
import { DateUtils_dayOfWeekStr, DateUtils_formatUTCYYYYMMDD, DateUtils_formatUTCYYYYMMDDHHMM } from "../../utils/date";
import { PriceUtils_exchangeRate } from "../../utils/price";

export interface IPaymentsDashboardContentProps {
  client: Window["fetch"];
  apiKey: string;
  paymentsData: IPaymentsDashboardData[];
  userAffiliates: Partial<Record<string, IPaymentsDashboardUserAffiliate>>;
  summary: IPaymentsSummary;
  serverTimestamp: number;
  nextBefore: number;
  hasMore: boolean;
}

interface IPaymentsPage {
  paymentsData: IPaymentsDashboardData[];
  userAffiliates: Partial<Record<string, IPaymentsDashboardUserAffiliate>>;
  nextBefore: number;
  hasMore: boolean;
}

export function computePaymentsSummary(paymentsData: IPaymentsDashboardData[], now?: number): IPaymentsSummary {
  const currencyTotals: Record<string, { total: number; refunds: number }> = {};
  const totalsByTypeAndCurrency: Record<string, { subscription: number; inapp: number }> = {};
  const totalsByPlatformAndCurrency: Record<string, { apple: number; google: number }> = {};
  let totalUSD = 0;
  let refundsUSD = 0;
  let totalSubscriptionUSD = 0;
  let totalInappUSD = 0;
  let totalAppleUSD = 0;
  let totalGoogleUSD = 0;
  let totalPurchases = 0;
  let totalSubscriptionPurchases = 0;
  let totalInappPurchases = 0;
  let totalApplePurchases = 0;
  let totalGooglePurchases = 0;
  let totalRenewals = 0;
  let totalRefunds = 0;
  let totalFreeTrials = 0;

  paymentsData.forEach((periodData) => {
    periodData.payments.forEach((payment) => {
      const curr = payment.currency || "USD";
      if (!currencyTotals[curr]) {
        currencyTotals[curr] = { total: 0, refunds: 0 };
      }
      if (!totalsByTypeAndCurrency[curr]) {
        totalsByTypeAndCurrency[curr] = { subscription: 0, inapp: 0 };
      }
      if (!totalsByPlatformAndCurrency[curr]) {
        totalsByPlatformAndCurrency[curr] = { apple: 0, google: 0 };
      }

      const netAmount = payment.amount - (payment.tax ?? 0);
      const isSubscription = !payment.productId.includes("lifetime");
      const platform = payment.type;

      if (payment.paymentType === "refund") {
        currencyTotals[curr].refunds += payment.amount;
        const usdConversion = PriceUtils_exchangeRate(payment.amount, curr);
        if (usdConversion.success) {
          refundsUSD += usdConversion.value;
        }
      } else {
        currencyTotals[curr].total += netAmount;
        const usdConversion = PriceUtils_exchangeRate(netAmount, curr);
        if (usdConversion.success) {
          totalUSD += usdConversion.value;
        }
        if (isSubscription) {
          totalsByTypeAndCurrency[curr].subscription += netAmount;
          const usdConv = PriceUtils_exchangeRate(netAmount, curr);
          if (usdConv.success) {
            totalSubscriptionUSD += usdConv.value;
          }
        } else {
          totalsByTypeAndCurrency[curr].inapp += netAmount;
          const usdConv = PriceUtils_exchangeRate(netAmount, curr);
          if (usdConv.success) {
            totalInappUSD += usdConv.value;
          }
        }
        if (platform === "apple") {
          totalsByPlatformAndCurrency[curr].apple += netAmount;
          const usdConv = PriceUtils_exchangeRate(netAmount, curr);
          if (usdConv.success) {
            totalAppleUSD += usdConv.value;
          }
        } else if (platform === "google") {
          totalsByPlatformAndCurrency[curr].google += netAmount;
          const usdConv = PriceUtils_exchangeRate(netAmount, curr);
          if (usdConv.success) {
            totalGoogleUSD += usdConv.value;
          }
        }
      }

      if (payment.paymentType === "purchase") {
        totalPurchases += 1;
        if (payment.productId.includes("lifetime")) {
          totalInappPurchases += 1;
        } else {
          totalSubscriptionPurchases += 1;
        }
        if (payment.type === "apple") {
          totalApplePurchases += 1;
        } else if (payment.type === "google") {
          totalGooglePurchases += 1;
        }
      } else if (payment.paymentType === "renewal") {
        totalRenewals += 1;
      } else if (payment.paymentType === "refund") {
        totalRefunds += 1;
      }
      if (payment.isFreeTrialPayment) {
        totalFreeTrials += 1;
      }
    });
  });

  const cancellationData = detectCancellations(paymentsData, now ?? Date.now());

  return {
    currencyTotals,
    totalsByTypeAndCurrency,
    totalsByPlatformAndCurrency,
    totalUSD,
    refundsUSD,
    totalSubscriptionUSD,
    totalInappUSD,
    totalAppleUSD,
    totalGoogleUSD,
    totalPurchases,
    totalSubscriptionPurchases,
    totalInappPurchases,
    totalApplePurchases,
    totalGooglePurchases,
    totalRenewals,
    totalRefunds,
    totalFreeTrials,
    totalCancellations: cancellationData.totalCancellations,
    monthlyCancellations: cancellationData.monthlyCancellations,
    yearlyCancellations: cancellationData.yearlyCancellations,
  };
}

function getAttributedAffiliate(
  payment: IPaymentDao,
  userAffiliates: Partial<Record<string, IPaymentsDashboardUserAffiliate>>
): IPaymentsDashboardUserAffiliate | undefined {
  const affiliate = userAffiliates[payment.userId];
  if (!affiliate) {
    return undefined;
  }
  if (payment.subscriptionStartTimestamp == null) {
    return undefined;
  }
  if (payment.subscriptionStartTimestamp <= affiliate.timestamp) {
    return undefined;
  }
  return affiliate;
}

function getProductType(product: string): string {
  if (product === "com.liftosaur.subscription.and_montly" || product === "com.liftosaur.subscription.ios_montly") {
    return "Monthly";
  } else if (
    product === "com.liftosaur.subscription.and_yearly" ||
    product === "com.liftosaur.subscription.ios_yearly"
  ) {
    return "Yearly";
  } else if (
    product === "com.liftosaur.subscription.and_lifetime" ||
    product === "com.liftosaur.subscription.ios_lifetime"
  ) {
    return "Lifetime";
  }
  return "Unknown";
}

function isMonthlySubscription(productId: string): boolean {
  return productId === "com.liftosaur.subscription.and_montly" || productId === "com.liftosaur.subscription.ios_montly";
}

function isYearlySubscription(productId: string): boolean {
  return productId === "com.liftosaur.subscription.and_yearly" || productId === "com.liftosaur.subscription.ios_yearly";
}

interface IUserSubscriptionInfo {
  userId: string;
  lastPaymentTimestamp: number;
  subscriptionType: "monthly" | "yearly";
  productId: string;
  expectedRenewalTimestamp: number;
  wasTrialPayment: boolean;
}

function detectCancellations(
  paymentsData: IPaymentsDashboardData[],
  now: number
): {
  cancellations: IUserSubscriptionInfo[];
  totalCancellations: number;
  monthlyCancellations: number;
  yearlyCancellations: number;
} {
  const userSubscriptions = new Map<string, IUserSubscriptionInfo>();

  paymentsData.forEach((dayData) => {
    dayData.payments.forEach((payment) => {
      if (payment.paymentType === "refund") {
        return;
      }

      const isMonthly = isMonthlySubscription(payment.productId);
      const isYearly = isYearlySubscription(payment.productId);

      if (!isMonthly && !isYearly) {
        return;
      }

      const existing = userSubscriptions.get(payment.userId);
      if (!existing || payment.timestamp > existing.lastPaymentTimestamp) {
        const lastPaymentDate = new Date(payment.timestamp);
        const expectedRenewalDate = new Date(lastPaymentDate);

        if (payment.isFreeTrialPayment) {
          expectedRenewalDate.setDate(expectedRenewalDate.getDate() + 14);
        } else if (isMonthly) {
          expectedRenewalDate.setMonth(expectedRenewalDate.getMonth() + 1);
        } else {
          expectedRenewalDate.setFullYear(expectedRenewalDate.getFullYear() + 1);
        }

        userSubscriptions.set(payment.userId, {
          userId: payment.userId,
          lastPaymentTimestamp: payment.timestamp,
          subscriptionType: isMonthly ? "monthly" : "yearly",
          productId: payment.productId,
          expectedRenewalTimestamp: expectedRenewalDate.getTime(),
          wasTrialPayment: payment.isFreeTrialPayment,
        });
      }
    });
  });

  const cancellations: IUserSubscriptionInfo[] = [];
  let monthlyCancellations = 0;
  let yearlyCancellations = 0;

  userSubscriptions.forEach((info) => {
    if (info.expectedRenewalTimestamp < now) {
      cancellations.push(info);
      if (info.subscriptionType === "monthly") {
        monthlyCancellations += 1;
      } else {
        yearlyCancellations += 1;
      }
    }
  });

  return {
    cancellations,
    totalCancellations: cancellations.length,
    monthlyCancellations,
    yearlyCancellations,
  };
}

function formatCurrency(amount: number, currency?: string): string {
  const curr = currency || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
    }).format(amount);
  } catch (e) {
    return `${curr} ${amount.toFixed(2)}`;
  }
}

function formatCurrencyWithUSD(amount: number, currency?: string): JSX.Element {
  const curr = currency || "USD";
  const formatted = formatCurrency(amount, curr);

  if (curr !== "USD") {
    const conversion = PriceUtils_exchangeRate(amount, curr);
    if (conversion.success) {
      const usdFormatted = formatCurrency(conversion.value, "USD");
      return (
        <span>
          {formatted} ({usdFormatted})
        </span>
      );
    } else {
      return (
        <span>
          {formatted} <span className="text-red-600">(no USD rate)</span>
        </span>
      );
    }
  }

  return <span>{formatted}</span>;
}

function getPaymentTypeColor(paymentType: string): string {
  switch (paymentType) {
    case "purchase":
      return "text-green-600";
    case "renewal":
      return "text-blue-600";
    case "refund":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
}

function groupByMonth(dailyData: IPaymentsDashboardData[]): IPaymentsDashboardData[] {
  const monthlyGroups: Record<string, IPaymentsDashboardData> = {};

  dailyData.forEach((dayData) => {
    if (!dayData.date || !dayData.payments) {
      return;
    }

    const dateParts = dayData.date.split("-");
    const year = dateParts[0];
    const month = dateParts[1];
    const monthKey = `${year}-${month}-01`;

    if (!monthlyGroups[monthKey]) {
      monthlyGroups[monthKey] = {
        date: monthKey,
        payments: [],
      };
    }

    monthlyGroups[monthKey].payments.push(...dayData.payments);
  });

  return Object.values(monthlyGroups)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((monthData) => ({
      ...monthData,
      payments: monthData.payments.sort((a, b) => b.timestamp - a.timestamp),
    }));
}

function groupCancellationsByPeriod(
  cancellations: IUserSubscriptionInfo[],
  viewMode: "day" | "month"
): Record<string, IUserSubscriptionInfo[]> {
  const grouped: Record<string, IUserSubscriptionInfo[]> = {};

  cancellations.forEach((cancellation) => {
    const date = new Date(cancellation.expectedRenewalTimestamp);
    let key: string;

    if (viewMode === "month") {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      key = `${year}-${month}-01`;
    } else {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const day = String(date.getUTCDate()).padStart(2, "0");
      key = `${year}-${month}-${day}`;
    }

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(cancellation);
  });

  return grouped;
}

export function PaymentsDashboardContent(props: IPaymentsDashboardContentProps): JSX.Element {
  const [viewMode, setViewMode] = useState<"day" | "month">("day");
  const [paymentsData, setPaymentsData] = useState<IPaymentsDashboardData[]>(props.paymentsData);
  const [userAffiliates, setUserAffiliates] = useState<Partial<Record<string, IPaymentsDashboardUserAffiliate>>>(
    props.userAffiliates
  );
  const [nextBefore, setNextBefore] = useState<number>(props.nextBefore);
  const [hasMore, setHasMore] = useState<boolean>(props.hasMore);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function loadMore(): Promise<void> {
    if (isLoading || !hasMore) {
      return;
    }
    setIsLoading(true);
    try {
      const url = `/dashboards/payments?key=${encodeURIComponent(props.apiKey)}&before=${nextBefore}&months=2`;
      const response = await props.client(url);
      const page = (await response.json()) as IPaymentsPage;
      setPaymentsData((prev) => prev.concat(page.paymentsData));
      setUserAffiliates((prev) => ({ ...prev, ...page.userAffiliates }));
      setNextBefore(page.nextBefore);
      setHasMore(page.hasMore);
    } finally {
      setIsLoading(false);
    }
  }

  const summary = props.summary;

  const cancellationData = detectCancellations(paymentsData, props.serverTimestamp);
  const cancellationsByPeriod = groupCancellationsByPeriod(cancellationData.cancellations, viewMode);

  const cancelledTrialUserIds = new Set(
    cancellationData.cancellations.filter((c) => c.wasTrialPayment).map((c) => c.userId)
  );

  const sortedDailyData = [...paymentsData].sort((a, b) => b.date.localeCompare(a.date));
  const groupedData = viewMode === "month" ? groupByMonth(paymentsData) : sortedDailyData;

  const totalsByPeriod = groupedData.map((periodData) => {
    const dayTotalsByCurrency: Record<string, { total: number; refunds: number }> = {};
    const dayTotalsByTypeAndCurrency: Record<string, { subscription: number; inapp: number }> = {};
    const dayTotalsByPlatformAndCurrency: Record<string, { apple: number; google: number }> = {};
    let dayTotalUSD = 0;
    let dayRefundsUSD = 0;
    let daySubscriptionUSD = 0;
    let dayInappUSD = 0;
    let dayAppleUSD = 0;
    let dayGoogleUSD = 0;

    periodData.payments.forEach((payment) => {
      const curr = payment.currency || "USD";
      if (!dayTotalsByCurrency[curr]) {
        dayTotalsByCurrency[curr] = { total: 0, refunds: 0 };
      }
      if (!dayTotalsByTypeAndCurrency[curr]) {
        dayTotalsByTypeAndCurrency[curr] = { subscription: 0, inapp: 0 };
      }
      if (!dayTotalsByPlatformAndCurrency[curr]) {
        dayTotalsByPlatformAndCurrency[curr] = { apple: 0, google: 0 };
      }

      const netAmount = payment.amount - (payment.tax ?? 0);
      const isSubscription = !payment.productId.includes("lifetime");
      const platform = payment.type;

      if (payment.paymentType === "refund") {
        dayTotalsByCurrency[curr].refunds += payment.amount;
        const usdConversion = PriceUtils_exchangeRate(payment.amount, curr);
        if (usdConversion.success) {
          dayRefundsUSD += usdConversion.value;
        }
      } else {
        dayTotalsByCurrency[curr].total += netAmount;
        const usdConversion = PriceUtils_exchangeRate(netAmount, curr);
        if (usdConversion.success) {
          dayTotalUSD += usdConversion.value;
        }

        if (isSubscription) {
          dayTotalsByTypeAndCurrency[curr].subscription += netAmount;
          const usdConv = PriceUtils_exchangeRate(netAmount, curr);
          if (usdConv.success) {
            daySubscriptionUSD += usdConv.value;
          }
        } else {
          dayTotalsByTypeAndCurrency[curr].inapp += netAmount;
          const usdConv = PriceUtils_exchangeRate(netAmount, curr);
          if (usdConv.success) {
            dayInappUSD += usdConv.value;
          }
        }

        if (platform === "apple") {
          dayTotalsByPlatformAndCurrency[curr].apple += netAmount;
          const usdConv = PriceUtils_exchangeRate(netAmount, curr);
          if (usdConv.success) {
            dayAppleUSD += usdConv.value;
          }
        } else if (platform === "google") {
          dayTotalsByPlatformAndCurrency[curr].google += netAmount;
          const usdConv = PriceUtils_exchangeRate(netAmount, curr);
          if (usdConv.success) {
            dayGoogleUSD += usdConv.value;
          }
        }
      }
    });

    const purchases = periodData.payments.filter((p) => p.paymentType === "purchase");
    const purchaseCount = purchases.length;
    const subscriptionPurchaseCount = purchases.filter((p) => !p.productId.includes("lifetime")).length;
    const inappPurchaseCount = purchases.filter((p) => p.productId.includes("lifetime")).length;
    const applePurchaseCount = purchases.filter((p) => p.type === "apple").length;
    const googlePurchaseCount = purchases.filter((p) => p.type === "google").length;

    const renewalCount = periodData.payments.filter((p) => p.paymentType === "renewal").length;
    const refundCount = periodData.payments.filter((p) => p.paymentType === "refund").length;
    const freeTrialCount = periodData.payments.filter((p) => p.isFreeTrialPayment).length;
    const periodCancellations = cancellationsByPeriod[periodData.date] || [];

    return {
      date: periodData.date,
      periodTotalsByCurrency: dayTotalsByCurrency,
      periodTotalsByTypeAndCurrency: dayTotalsByTypeAndCurrency,
      periodTotalsByPlatformAndCurrency: dayTotalsByPlatformAndCurrency,
      dayTotalUSD,
      dayRefundsUSD,
      daySubscriptionUSD,
      dayInappUSD,
      dayAppleUSD,
      dayGoogleUSD,
      purchaseCount,
      subscriptionPurchaseCount,
      inappPurchaseCount,
      applePurchaseCount,
      googlePurchaseCount,
      renewalCount,
      refundCount,
      freeTrialCount,
      cancellationCount: periodCancellations.length,
      cancellations: periodCancellations,
      payments: periodData.payments,
    };
  });

  const {
    currencyTotals,
    totalsByTypeAndCurrency,
    totalsByPlatformAndCurrency,
    totalUSD,
    refundsUSD,
    totalSubscriptionUSD,
    totalInappUSD,
    totalAppleUSD,
    totalGoogleUSD,
    totalPurchases,
    totalSubscriptionPurchases,
    totalInappPurchases,
    totalApplePurchases,
    totalGooglePurchases,
    totalRenewals,
    totalRefunds,
    totalFreeTrials,
  } = summary;

  return (
    <section className="py-16">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Payments Dashboard</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("day")}
            className={`px-4 py-2 rounded ${viewMode === "day" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
          >
            Daily
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`px-4 py-2 rounded ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="p-4 mb-8 bg-gray-100 rounded">
        <h3 className="mb-2 text-lg font-semibold">Summary</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
          <div>
            <div className="text-sm text-gray-600">Total Revenue</div>
            <div>
              {Object.entries(currencyTotals)
                .sort(([currencyA, totalsA], [currencyB, totalsB]) => {
                  // Convert to USD for sorting
                  const amountA = totalsA.total - totalsA.refunds;
                  const amountB = totalsB.total - totalsB.refunds;
                  const usdA = currencyA === "USD" ? amountA : PriceUtils_exchangeRate(amountA, currencyA).value;
                  const usdB = currencyB === "USD" ? amountB : PriceUtils_exchangeRate(amountB, currencyB).value;
                  return usdB - usdA; // Descending order
                })
                .map(([currency, totals]) => (
                  <div key={currency}>
                    <div className="text-xl font-bold">
                      {formatCurrencyWithUSD(totals.total - totals.refunds, currency)}
                    </div>
                    {totalsByTypeAndCurrency[currency] && (
                      <div className="text-xs text-gray-600">
                        Sub: {formatCurrencyWithUSD(totalsByTypeAndCurrency[currency].subscription, currency)}
                        {totalsByTypeAndCurrency[currency].inapp > 0 && (
                          <span>
                            {" "}
                            | IAP: {formatCurrencyWithUSD(totalsByTypeAndCurrency[currency].inapp, currency)}
                          </span>
                        )}
                      </div>
                    )}
                    {totalsByPlatformAndCurrency[currency] && (
                      <div className="text-xs text-gray-600">
                        iOS: {formatCurrencyWithUSD(totalsByPlatformAndCurrency[currency].apple, currency)} | Android:{" "}
                        {formatCurrencyWithUSD(totalsByPlatformAndCurrency[currency].google, currency)}
                      </div>
                    )}
                  </div>
                ))}
              <div className="pt-2 mt-2 border-t">
                <div className="text-xl font-bold text-green-700">
                  Total USD: {formatCurrency(totalUSD - refundsUSD, "USD")}
                </div>
                <div className="text-xs text-gray-600">
                  Sub: {formatCurrency(totalSubscriptionUSD, "USD")}
                  {totalInappUSD > 0 && ` | IAP: ${formatCurrency(totalInappUSD, "USD")}`}
                </div>
                <div className="text-xs text-gray-600">
                  iOS: {formatCurrency(totalAppleUSD, "USD")} | Android: {formatCurrency(totalGoogleUSD, "USD")}
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Purchases</div>
            <div className="text-xl font-bold text-green-600">{totalPurchases}</div>
            <div className="text-xs text-gray-600">
              Sub: {totalSubscriptionPurchases} | IAP: {totalInappPurchases}
            </div>
            <div className="text-xs text-gray-600">
              iOS: {totalApplePurchases} | Android: {totalGooglePurchases}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Renewals</div>
            <div className="text-xl font-bold text-blue-600">{totalRenewals}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Cancellations</div>
            <div className="text-xl font-bold text-orange-600">{summary.totalCancellations}</div>
            <div className="text-xs text-gray-600">
              Monthly: {summary.monthlyCancellations} | Yearly: {summary.yearlyCancellations}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Refunds</div>
            <div className="text-xl font-bold text-red-600">{totalRefunds}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Free Trials</div>
            <div className="text-xl font-bold text-purple-600">{totalFreeTrials}</div>
          </div>
        </div>
      </div>

      {totalsByPeriod.map((periodData) => (
        <div key={periodData.date} className="pb-4 mb-8 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">
              {viewMode === "month"
                ? (() => {
                    const [year, month] = periodData.date.split("-");
                    const monthNames = [
                      "January",
                      "February",
                      "March",
                      "April",
                      "May",
                      "June",
                      "July",
                      "August",
                      "September",
                      "October",
                      "November",
                      "December",
                    ];
                    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
                  })()
                : `${DateUtils_dayOfWeekStr(periodData.date)}, ${periodData.date}`}
            </h3>
            <div className="flex flex-col gap-1">
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">
                  Purchases: {periodData.purchaseCount}
                  {periodData.purchaseCount > 0 && (
                    <span className="text-xs">
                      {` (Sub: ${periodData.subscriptionPurchaseCount}`}
                      {`, IAP: ${periodData.inappPurchaseCount}`}
                      {` | iOS: ${periodData.applePurchaseCount}, Android: ${periodData.googlePurchaseCount})`}
                    </span>
                  )}
                </span>
                <span className="text-blue-600">Renewals: {periodData.renewalCount}</span>
                {periodData.cancellationCount > 0 && (
                  <span className="text-orange-600">Cancellations: {periodData.cancellationCount}</span>
                )}
                {periodData.refundCount > 0 && <span className="text-red-600">Refunds: {periodData.refundCount}</span>}
                {periodData.freeTrialCount > 0 && (
                  <span className="text-purple-600">Free Trials: {periodData.freeTrialCount}</span>
                )}
              </div>
              <div className="text-sm">
                <div className="font-bold">Net:</div>
                {Object.entries(periodData.periodTotalsByCurrency)
                  .sort(([currencyA, totalsA], [currencyB, totalsB]) => {
                    // Convert to USD for sorting
                    const amountA = totalsA.total - totalsA.refunds;
                    const amountB = totalsB.total - totalsB.refunds;
                    const usdA = currencyA === "USD" ? amountA : PriceUtils_exchangeRate(amountA, currencyA).value;
                    const usdB = currencyB === "USD" ? amountB : PriceUtils_exchangeRate(amountB, currencyB).value;
                    return usdB - usdA; // Descending order
                  })
                  .map(([currency, totals]) => {
                    const netAmount = totals.total - totals.refunds;
                    const typeData = periodData.periodTotalsByTypeAndCurrency[currency];
                    const platformData = periodData.periodTotalsByPlatformAndCurrency[currency];

                    return (
                      <div key={currency} className="ml-4 text-sm">
                        <span className="font-semibold">{formatCurrencyWithUSD(netAmount, currency)}</span>
                        {typeData && (
                          <span className="ml-2 text-xs text-gray-600">
                            Sub: {formatCurrencyWithUSD(typeData.subscription, currency)}, IAP:{" "}
                            {formatCurrencyWithUSD(typeData.inapp, currency)}
                          </span>
                        )}
                        {platformData && (
                          <span className="ml-2 text-xs text-gray-600">
                            | iOS: {formatCurrencyWithUSD(platformData.apple, currency)}, Android:{" "}
                            {formatCurrencyWithUSD(platformData.google, currency)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                <div className="pt-1 mt-1 ml-4 text-sm border-t">
                  <span className="font-semibold text-green-700">
                    USD Total: {formatCurrency(periodData.dayTotalUSD - periodData.dayRefundsUSD, "USD")}
                  </span>
                  <span className="ml-2 text-xs text-gray-600">
                    Sub: {formatCurrency(periodData.daySubscriptionUSD, "USD")}, IAP:{" "}
                    {formatCurrency(periodData.dayInappUSD, "USD")}
                  </span>
                  <span className="ml-2 text-xs text-gray-600">
                    | iOS: {formatCurrency(periodData.dayAppleUSD, "USD")}, Android:{" "}
                    {formatCurrency(periodData.dayGoogleUSD, "USD")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left">{viewMode === "month" ? "Start Date" : "Start Time"}, UTC</th>
                  <th className="px-2 py-2 text-left">{viewMode === "month" ? "Date" : "Time"}, UTC</th>
                  <th className="px-2 py-2 text-left">User ID</th>
                  <th className="px-2 py-2 text-left">Transaction ID</th>
                  <th className="px-2 py-2 text-left">Product</th>
                  <th className="px-2 py-2 text-left">Type</th>
                  <th className="px-2 py-2 text-left">Platform</th>
                  <th className="px-2 py-2 text-left">Source</th>
                  <th className="px-2 py-2 text-left">Offer</th>
                  <th className="px-2 py-2 text-left">Affiliate</th>
                  <th className="px-2 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {periodData.payments.map((payment, idx) => (
                  <tr
                    key={`${payment.transactionId}-${idx}`}
                    className={`border-b ${payment.source === "reconciler" ? "bg-yellow-50 hover:bg-yellow-100" : "hover:bg-gray-50"}`}
                  >
                    <td className="px-2 py-2">
                      {payment.subscriptionStartTimestamp != null
                        ? DateUtils_formatUTCYYYYMMDD(payment.subscriptionStartTimestamp)
                        : "Unknown"}
                    </td>
                    <td className="px-2 py-2">
                      {viewMode === "month"
                        ? DateUtils_formatUTCYYYYMMDDHHMM(payment.timestamp)
                        : TimeUtils_formatUTCHHMM(payment.timestamp)}
                    </td>
                    <td className="px-2 py-2">
                      <a
                        href={`/dashboards/user/${payment.userId}?key=${props.apiKey}`}
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {payment.userId}
                      </a>
                    </td>
                    <td className="px-2 py-2 font-mono text-xs">{StringUtils_truncate(payment.transactionId, 20)}</td>
                    <td className="px-2 py-2">{getProductType(payment.productId)}</td>
                    <td className={`py-2 px-2 ${getPaymentTypeColor(payment.paymentType)}`}>
                      {payment.paymentType}
                      {payment.isFreeTrialPayment && (
                        <span className="ml-1 text-purple-600">
                          (trial{cancelledTrialUserIds.has(payment.userId) ? ", C" : ""})
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2">{payment.type}</td>
                    <td className="px-2 py-2">{payment.source}</td>
                    <td className="px-2 py-2 font-mono text-xs text-purple-600">{payment.offerIdentifier || "-"}</td>
                    <td className="px-2 py-2 font-mono text-xs">
                      {(() => {
                        const affiliate = getAttributedAffiliate(payment, userAffiliates);
                        return affiliate ? (
                          <a
                            href={`/dashboards/affiliates/${affiliate.affiliateId}?key=${props.apiKey}`}
                            className="text-blue-600 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {affiliate.affiliateId}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        );
                      })()}
                    </td>
                    <td className="px-2 py-2 font-mono text-right">
                      {formatCurrencyWithUSD(payment.amount - (payment.tax ?? 0), payment.currency)}
                      {payment.tax ? <span className="text-xs text-gray-500"> (+{payment.tax.toFixed(2)})</span> : null}
                    </td>
                  </tr>
                ))}
                {periodData.cancellations.map((cancellation, idx) => (
                  <tr
                    key={`cancellation-${cancellation.userId}-${idx}`}
                    className="bg-orange-50 border-b hover:bg-orange-100"
                  >
                    <td className="px-2 py-2">{DateUtils_formatUTCYYYYMMDD(cancellation.lastPaymentTimestamp)}</td>
                    <td className="px-2 py-2">
                      {viewMode === "month"
                        ? DateUtils_formatUTCYYYYMMDDHHMM(cancellation.expectedRenewalTimestamp)
                        : TimeUtils_formatUTCHHMM(cancellation.expectedRenewalTimestamp)}
                    </td>
                    <td className="px-2 py-2">
                      <a
                        href={`/dashboards/user/${cancellation.userId}?key=${props.apiKey}`}
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {cancellation.userId}
                      </a>
                    </td>
                    <td className="px-2 py-2 font-mono text-xs text-gray-400">-</td>
                    <td className="px-2 py-2">{getProductType(cancellation.productId)}</td>
                    <td className="px-2 py-2 text-orange-600">
                      cancellation
                      {cancellation.wasTrialPayment && <span className="ml-1 text-purple-600">(trial)</span>}
                    </td>
                    <td className="px-2 py-2 text-gray-400">-</td>
                    <td className="px-2 py-2 text-gray-400">-</td>
                    <td className="px-2 py-2 text-gray-400">-</td>
                    <td className="px-2 py-2 text-gray-400">-</td>
                    <td className="px-2 py-2 font-mono text-right text-gray-400">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="my-8 text-center">
          <button
            disabled={isLoading}
            onClick={loadMore}
            className="px-6 py-2 font-semibold text-white bg-blue-600 rounded disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </section>
  );
}
