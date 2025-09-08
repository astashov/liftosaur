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
}

export interface IAffiliateData {
  userId: string;
  affiliateTimestamp: number;
  importDate: string;
  numberOfWorkouts: number;
  lastWorkoutTs: number;
  daysOfUsing: number;
  isPaid: boolean;
  hasActiveSubscription: boolean;
  isFirstAffiliate: boolean;
  userTotalRevenue: number; // in dollars
  userMonthlyRevenue: number; // in dollars
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
      <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total Users</div>
          <div className="text-2xl font-bold">{props.summary.totalUsers}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Paid Users</div>
          <div className="text-2xl font-bold text-green-600">{props.summary.paidUsers}</div>
          <div className="text-xs text-gray-500">
            {props.summary.totalUsers > 0
              ? `${((props.summary.paidUsers / props.summary.totalUsers) * 100).toFixed(1)}%`
              : "0%"}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Monthly Revenue (20%)</div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(props.summary.monthlyRevenue)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total Revenue (20%)</div>
          <div className="text-2xl font-bold text-purple-600">{formatCurrency(props.summary.totalRevenue)}</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Affiliated Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Import Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workouts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monthly Rev
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Rev
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  First Affiliate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {props.affiliateData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    No affiliated users yet
                  </td>
                </tr>
              ) : (
                props.affiliateData.map((item) => {
                  return (
                    <tr key={item.userId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.userId.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.affiliateTimestamp).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.numberOfWorkouts}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.daysOfUsing}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.paymentsCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(item.userMonthlyRevenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(item.userTotalRevenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">How the Affiliate Program Works:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• You earn 20% of all revenue from users who import your programs</li>
          <li>• Revenue is counted only from payments made AFTER the user imported your program</li>
          <li>• If a user imported multiple programs, only the first program creator gets the commission</li>
          <li>• Commissions apply to both one-time purchases and subscription renewals</li>
        </ul>
      </div>
    </section>
  );
}
