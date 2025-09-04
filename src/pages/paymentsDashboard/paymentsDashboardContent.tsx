import { h, JSX } from "preact";
import { useState } from "preact/hooks";
import { IPaymentsDashboardData } from "../../../lambda/paymentsDashboard";
import { StringUtils } from "../../utils/string";
import { TimeUtils } from "../../utils/time";
import { DateUtils } from "../../utils/date";

export interface IPaymentsDashboardContentProps {
  client: Window["fetch"];
  apiKey: string;
  paymentsData: IPaymentsDashboardData[];
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

export function PaymentsDashboardContent(props: IPaymentsDashboardContentProps): JSX.Element {
  const [viewMode, setViewMode] = useState<"day" | "month">("day");
  const currencyTotals: Record<string, { total: number; refunds: number }> = {};

  const sortedDailyData = [...props.paymentsData].sort((a, b) => b.date.localeCompare(a.date));
  const groupedData = viewMode === "month" ? groupByMonth(props.paymentsData) : sortedDailyData;

  const totalsByPeriod = groupedData.map((periodData) => {
    const dayTotalsByCurrency: Record<string, { total: number; refunds: number }> = {};
    const dayTotalsByTypeAndCurrency: Record<string, { subscription: number; inapp: number }> = {};
    const dayTotalsByPlatformAndCurrency: Record<string, { apple: number; google: number }> = {};

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
      if (!currencyTotals[curr]) {
        currencyTotals[curr] = { total: 0, refunds: 0 };
      }

      const netAmount = payment.amount - (payment.tax ?? 0);
      const isSubscription = !payment.productId.includes("lifetime");
      const platform = payment.type;

      if (payment.paymentType === "refund") {
        dayTotalsByCurrency[curr].refunds += payment.amount;
        currencyTotals[curr].refunds += payment.amount;
      } else {
        dayTotalsByCurrency[curr].total += netAmount;
        currencyTotals[curr].total += netAmount;

        if (isSubscription) {
          dayTotalsByTypeAndCurrency[curr].subscription += netAmount;
        } else {
          dayTotalsByTypeAndCurrency[curr].inapp += netAmount;
        }

        if (platform === "apple") {
          dayTotalsByPlatformAndCurrency[curr].apple += netAmount;
        } else if (platform === "google") {
          dayTotalsByPlatformAndCurrency[curr].google += netAmount;
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

    return {
      date: periodData.date,
      periodTotalsByCurrency: dayTotalsByCurrency,
      periodTotalsByTypeAndCurrency: dayTotalsByTypeAndCurrency,
      periodTotalsByPlatformAndCurrency: dayTotalsByPlatformAndCurrency,
      purchaseCount,
      subscriptionPurchaseCount,
      inappPurchaseCount,
      applePurchaseCount,
      googlePurchaseCount,
      renewalCount,
      refundCount,
      freeTrialCount,
      payments: periodData.payments,
    };
  });

  const totalPurchases = totalsByPeriod.reduce((sum, period) => sum + period.purchaseCount, 0);
  const totalSubscriptionPurchases = totalsByPeriod.reduce((sum, period) => sum + period.subscriptionPurchaseCount, 0);
  const totalInappPurchases = totalsByPeriod.reduce((sum, period) => sum + period.inappPurchaseCount, 0);
  const totalApplePurchases = totalsByPeriod.reduce((sum, period) => sum + period.applePurchaseCount, 0);
  const totalGooglePurchases = totalsByPeriod.reduce((sum, period) => sum + period.googlePurchaseCount, 0);
  const totalRenewals = totalsByPeriod.reduce((sum, period) => sum + period.renewalCount, 0);
  const totalRefunds = totalsByPeriod.reduce((sum, period) => sum + period.refundCount, 0);
  const totalFreeTrials = totalsByPeriod.reduce((sum, period) => sum + period.freeTrialCount, 0);

  const totalsByTypeAndCurrency: Record<string, { subscription: number; inapp: number }> = {};
  const totalsByPlatformAndCurrency: Record<string, { apple: number; google: number }> = {};

  totalsByPeriod.forEach((period) => {
    Object.entries(period.periodTotalsByTypeAndCurrency).forEach(([currency, totals]) => {
      if (!totalsByTypeAndCurrency[currency]) {
        totalsByTypeAndCurrency[currency] = { subscription: 0, inapp: 0 };
      }
      totalsByTypeAndCurrency[currency].subscription += totals.subscription;
      totalsByTypeAndCurrency[currency].inapp += totals.inapp;
    });

    Object.entries(period.periodTotalsByPlatformAndCurrency).forEach(([currency, totals]) => {
      if (!totalsByPlatformAndCurrency[currency]) {
        totalsByPlatformAndCurrency[currency] = { apple: 0, google: 0 };
      }
      totalsByPlatformAndCurrency[currency].apple += totals.apple;
      totalsByPlatformAndCurrency[currency].google += totals.google;
    });
  });
  console.log(totalsByPeriod);

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
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div>
            <div className="text-sm text-gray-600">Total Revenue</div>
            <div>
              {Object.entries(currencyTotals).map(([currency, totals]) => (
                <div key={currency}>
                  <div className="text-xl font-bold">{formatCurrency(totals.total - totals.refunds, currency)}</div>
                  {totalsByTypeAndCurrency[currency] && (
                    <div className="text-xs text-gray-600">
                      Sub: {formatCurrency(totalsByTypeAndCurrency[currency].subscription, currency)}
                      {totalsByTypeAndCurrency[currency].inapp > 0 &&
                        ` | IAP: ${formatCurrency(totalsByTypeAndCurrency[currency].inapp, currency)}`}
                    </div>
                  )}
                  {totalsByPlatformAndCurrency[currency] && (
                    <div className="text-xs text-gray-600">
                      iOS: {formatCurrency(totalsByPlatformAndCurrency[currency].apple, currency)} | Android:{" "}
                      {formatCurrency(totalsByPlatformAndCurrency[currency].google, currency)}
                    </div>
                  )}
                </div>
              ))}
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
                : `${DateUtils.dayOfWeekStr(periodData.date)}, ${periodData.date}`}
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
                {periodData.refundCount > 0 && <span className="text-red-600">Refunds: {periodData.refundCount}</span>}
                {periodData.freeTrialCount > 0 && (
                  <span className="text-purple-600">Free Trials: {periodData.freeTrialCount}</span>
                )}
              </div>
              <div className="text-sm">
                <div className="font-bold">Net:</div>
                {Object.entries(periodData.periodTotalsByCurrency).map(([currency, totals]) => {
                  const netAmount = totals.total - totals.refunds;
                  const typeData = periodData.periodTotalsByTypeAndCurrency[currency];
                  const platformData = periodData.periodTotalsByPlatformAndCurrency[currency];

                  return (
                    <div key={currency} className="ml-4 text-sm">
                      <span className="font-semibold">{formatCurrency(netAmount, currency)}</span>
                      {typeData && (
                        <span className="ml-2 text-xs text-gray-600">
                          Sub: {formatCurrency(typeData.subscription, currency)}, IAP:{" "}
                          {formatCurrency(typeData.inapp, currency)}
                        </span>
                      )}
                      {platformData && (
                        <span className="ml-2 text-xs text-gray-600">
                          | iOS: {formatCurrency(platformData.apple, currency)}, Android:{" "}
                          {formatCurrency(platformData.google, currency)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left">{viewMode === "month" ? "Date" : "Time"}, UTC</th>
                  <th className="px-2 py-2 text-left">User ID</th>
                  <th className="px-2 py-2 text-left">Transaction ID</th>
                  <th className="px-2 py-2 text-left">Product</th>
                  <th className="px-2 py-2 text-left">Type</th>
                  <th className="px-2 py-2 text-left">Platform</th>
                  <th className="px-2 py-2 text-left">Source</th>
                  <th className="px-2 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {periodData.payments.map((payment, idx) => (
                  <tr key={`${payment.transactionId}-${idx}`} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-2">
                      {viewMode === "month"
                        ? DateUtils.formatUTCYYYYMMDDHHMM(payment.timestamp)
                        : TimeUtils.formatUTCHHMM(payment.timestamp)}
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
                    <td className="px-2 py-2 font-mono text-xs">{StringUtils.truncate(payment.transactionId, 20)}</td>
                    <td className="px-2 py-2">{getProductType(payment.productId)}</td>
                    <td className={`py-2 px-2 ${getPaymentTypeColor(payment.paymentType)}`}>
                      {payment.paymentType}
                      {payment.isFreeTrialPayment && <span className="ml-1 text-purple-600">(trial)</span>}
                    </td>
                    <td className="px-2 py-2">{payment.type}</td>
                    <td className="px-2 py-2">{payment.source}</td>
                    <td className="px-2 py-2 font-mono text-right">
                      {formatCurrency(payment.amount - (payment.tax ?? 0), payment.currency)}
                      {payment.tax ? <span className="text-xs text-gray-500"> (+{payment.tax.toFixed(2)})</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}
