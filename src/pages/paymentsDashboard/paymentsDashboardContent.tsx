import { h, JSX } from "preact";
import { IPaymentsDashboardData } from "../../../lambda/paymentsDashboard";
import { StringUtils } from "../../utils/string";

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

export function PaymentsDashboardContent(props: IPaymentsDashboardContentProps): JSX.Element {
  const currencyTotals: Record<string, { total: number; refunds: number }> = {};

  const totalsByDay = props.paymentsData.map((dayData) => {
    const dayTotalsByCurrency: Record<string, { total: number; refunds: number }> = {};

    dayData.payments.forEach((payment) => {
      const curr = payment.currency || "USD";
      if (!dayTotalsByCurrency[curr]) {
        dayTotalsByCurrency[curr] = { total: 0, refunds: 0 };
      }
      if (!currencyTotals[curr]) {
        currencyTotals[curr] = { total: 0, refunds: 0 };
      }

      if (payment.paymentType === "refund") {
        dayTotalsByCurrency[curr].refunds += payment.amount;
        currencyTotals[curr].refunds += payment.amount;
      } else {
        dayTotalsByCurrency[curr].total += payment.amount - (payment.tax ?? 0);
        currencyTotals[curr].total += payment.amount - (payment.tax ?? 0);
      }
    });

    const purchaseCount = dayData.payments.filter((p) => p.paymentType === "purchase").length;
    const renewalCount = dayData.payments.filter((p) => p.paymentType === "renewal").length;
    const refundCount = dayData.payments.filter((p) => p.paymentType === "refund").length;
    const freeTrialCount = dayData.payments.filter((p) => p.isFreeTrialPayment).length;

    return {
      date: dayData.date,
      dayTotalsByCurrency,
      purchaseCount,
      renewalCount,
      refundCount,
      freeTrialCount,
      payments: dayData.payments,
    };
  });

  const totalPurchases = totalsByDay.reduce((sum, day) => sum + day.purchaseCount, 0);
  const totalRenewals = totalsByDay.reduce((sum, day) => sum + day.renewalCount, 0);
  const totalRefunds = totalsByDay.reduce((sum, day) => sum + day.refundCount, 0);
  const totalFreeTrials = totalsByDay.reduce((sum, day) => sum + day.freeTrialCount, 0);

  return (
    <section className="py-16">
      <h2 className="mb-4 text-2xl font-bold">Payments Dashboard</h2>

      <div className="p-4 mb-8 bg-gray-100 rounded">
        <h3 className="mb-2 text-lg font-semibold">Summary</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div>
            <div className="text-sm text-gray-600">Total Revenue</div>
            <div>
              {Object.entries(currencyTotals).map(([currency, totals]) => (
                <div key={currency} className="text-xl font-bold">
                  {formatCurrency(totals.total - totals.refunds, currency)}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Purchases</div>
            <div className="text-xl font-bold text-green-600">{totalPurchases}</div>
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

      {totalsByDay.map((dayData) => (
        <div key={dayData.date} className="pb-4 mb-8 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">
              {new Date(dayData.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </h3>
            <div className="flex gap-4 text-sm">
              <span className="text-green-600">Purchases: {dayData.purchaseCount}</span>
              <span className="text-blue-600">Renewals: {dayData.renewalCount}</span>
              {dayData.refundCount > 0 && <span className="text-red-600">Refunds: {dayData.refundCount}</span>}
              {dayData.freeTrialCount > 0 && (
                <span className="text-purple-600">Free Trials: {dayData.freeTrialCount}</span>
              )}
              <span className="font-bold">
                Net:{" "}
                {Object.entries(dayData.dayTotalsByCurrency)
                  .map(([currency, totals]) => formatCurrency(totals.total - totals.refunds, currency))
                  .join(", ")}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left">Time</th>
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
                {dayData.payments.map((payment, idx) => (
                  <tr key={`${payment.transactionId}-${idx}`} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-2">
                      {new Date(payment.timestamp).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
                      {payment.tax ? <span className="text-xs text-gray-500"> (+{payment.tax})</span> : null}
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
