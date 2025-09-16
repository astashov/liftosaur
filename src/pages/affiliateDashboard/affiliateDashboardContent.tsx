import { h, JSX } from "preact";

export interface IAffiliateDashboardSummary {
  totalUsers: number;
  paidUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export interface IAffiliateDashboardContentProps {
  client: Window["fetch"];
  affiliateData: IAffiliateData[];
  affiliateId: string;
  summary: IAffiliateDashboardSummary;
  monthlyPayments: { month: string; revenue: number; count: number }[];
  apiKey: string;
}

export interface IAffiliateData {
  userId: string;
  affiliateTimestamp: number;
  numberOfWorkouts: number;
  lastWorkoutTs: number;
  daysOfUsing: number;
  isPaid: boolean;
  isSignedUp: boolean;
  hasActiveSubscription: boolean;
  isFirstAffiliate: boolean;
  userTotalRevenue: number;
  userMonthlyRevenue: number;
  paymentsCount: number;
}

export function AffiliateDashboardContent(props: IAffiliateDashboardContentProps): JSX.Element {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

  return (
    <section className="py-8">
      <h1 className="mb-8 text-3xl font-bold">
        Affiliate Dashboard: <span className="text-blue-600">{props.affiliateId}</span>
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-4">
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow">
          <div className="mb-1 text-sm text-gray-600">Total Users</div>
          <div className="text-2xl font-bold">{props.summary.totalUsers}</div>
        </div>
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow">
          <div className="mb-1 text-sm text-gray-600">Paid Users</div>
          <div className="text-2xl font-bold text-green-600">{props.summary.paidUsers}</div>
          <div className="text-xs text-gray-500">
            {props.summary.totalUsers > 0
              ? `${((props.summary.paidUsers / props.summary.totalUsers) * 100).toFixed(1)}%`
              : "0%"}
          </div>
        </div>
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow">
          <div className="mb-1 text-sm text-gray-600">Monthly Revenue (20%)</div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(props.summary.monthlyRevenue)}</div>
        </div>
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow">
          <div className="mb-1 text-sm text-gray-600">Total Revenue (20%)</div>
          <div className="text-2xl font-bold text-purple-600">{formatCurrency(props.summary.totalRevenue)}</div>
        </div>
      </div>

      {/* Payments by Month */}
      <div className="mb-8 overflow-hidden bg-white rounded-lg shadow">
        <div className="px-4 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Payments by Month</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Month
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Number of Payments
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Revenue (20% share)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {props.monthlyPayments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-gray-500">
                    No payments yet
                  </td>
                </tr>
              ) : (
                props.monthlyPayments.map((monthData) => {
                  const [year, month] = monthData.month.split("-");
                  const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  });
                  return (
                    <tr key={monthData.month} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{monthName}</td>
                      <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">{monthData.count}</td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {formatCurrency(monthData.revenue)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden bg-white rounded-lg shadow">
        <div className="px-4 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Affiliated Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  User ID
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Signed?
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Import Date
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Workouts
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Days Active
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Payments
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Monthly Rev
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Total Rev
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  First Affiliate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {props.affiliateData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-4 text-center text-gray-500">
                    No affiliated users yet
                  </td>
                </tr>
              ) : (
                props.affiliateData.map((item) => {
                  return (
                    <tr key={item.userId} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                        <a
                          href={`/dashboards/user/${item.userId}?key=${props.apiKey}`}
                          className="text-text-link"
                          target="_blank"
                        >
                          {item.userId}
                        </a>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {item.isSignedUp ? (
                          <span className="font-medium text-green-600">Yes</span>
                        ) : (
                          <span className="font-medium text-red-600">No</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {item.affiliateTimestamp ? new Date(item.affiliateTimestamp).toLocaleDateString() : "Unknown"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.isPaid
                              ? "bg-green-100 text-green-800"
                              : item.hasActiveSubscription
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {item.isPaid ? "Paid" : item.hasActiveSubscription ? "Active" : "Free"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">{item.numberOfWorkouts}</td>
                      <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">{item.daysOfUsing}</td>
                      <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">{item.paymentsCount}</td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {formatCurrency(item.userMonthlyRevenue)}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {formatCurrency(item.userTotalRevenue)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.isFirstAffiliate ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.isFirstAffiliate ? "Yes" : "No"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 mt-8 border border-blue-200 rounded-lg bg-blue-50">
        <h3 className="mb-2 text-sm font-semibold text-blue-900">How the Affiliate Program Works:</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• You earn 20% of all revenue from users who import your programs</li>
          <li>• Revenue is counted only from payments made AFTER the user imported your program</li>
          <li>• If a user imported multiple programs, only the first program creator gets the commission</li>
          <li>• Commissions apply to both one-time purchases and subscription renewals</li>
        </ul>
      </div>
    </section>
  );
}
