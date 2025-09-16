import { h, JSX } from "preact";
import { IAccount } from "../../models/account";
import type { ICreatorStats } from "../../../lambda/userAffiliates";

export interface IUserAffiliatesSummary {
  totalUsers: number;
  signedUpUsers: number;
  paidUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export interface IUserAffiliatesContentProps {
  client: Window["fetch"];
  account: IAccount | undefined;
  creatorStats: ICreatorStats;
}

export function UserAffiliatesContent(props: IUserAffiliatesContentProps): JSX.Element {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };
  const { summary, monthlyPayments } = props.creatorStats;

  return (
    <section className="py-8">
      <h1 className="mb-8 text-3xl font-bold">Affiliate Program</h1>

      <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow">
          <div className="mb-1 text-sm text-gray-600">Total Users</div>
          <div className="text-3xl font-bold text-gray-900">{summary.totalUsers}</div>
          <div className="mt-1 text-xs text-gray-500">Who imported your programs</div>
          <div className="mt-1 text-xs text-gray-500">
            (<span className="text-green-700">{summary.signedUpUsers}</span> signed up,{" "}
            <span className="text-red-700">{summary.totalUsers - summary.signedUpUsers}</span> not)
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow">
          <div className="mb-1 text-sm text-gray-600">Paying Users</div>
          <div className="text-3xl font-bold text-green-600">{summary.paidUsers}</div>
          <div className="mt-1 text-xs text-gray-500">
            {summary.totalUsers > 0
              ? `${((summary.paidUsers / summary.totalUsers) * 100).toFixed(1)}% conversion`
              : "No users yet"}
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow">
          <div className="mb-1 text-sm text-gray-600">This Month</div>
          <div className="text-3xl font-bold text-blue-600">{formatCurrency(summary.monthlyRevenue)}</div>
          <div className="mt-1 text-xs text-gray-500">Your 20% share</div>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow">
          <div className="mb-1 text-sm text-gray-600">Total Earnings</div>
          <div className="text-3xl font-bold text-purple-600">{formatCurrency(summary.totalRevenue)}</div>
          <div className="mt-1 text-xs text-gray-500">Lifetime revenue</div>
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
              {monthlyPayments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-gray-500">
                    No payments yet
                  </td>
                </tr>
              ) : (
                monthlyPayments.map((monthData) => {
                  const [year, month] = monthData.month.split("-");
                  const monthName = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1).toLocaleDateString(
                    "en-US",
                    {
                      month: "long",
                      year: "numeric",
                    }
                  );
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

      <div className="mb-8">
        <h2 className="mb-4 text-2xl font-bold">How the Affiliate Program Works</h2>

        <div className="p-6 border border-blue-200 rounded-lg bg-blue-50">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex items-center justify-center flex-shrink-0 w-6 h-6 text-sm font-bold text-white bg-blue-500 rounded-full">
                1
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Share Your Programs</h3>
                <p className="text-sm text-blue-800">
                  When users import any of your published programs, they're automatically linked to your affiliate
                  account.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex items-center justify-center flex-shrink-0 w-6 h-6 text-sm font-bold text-white bg-blue-500 rounded-full">
                2
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Users Subscribe</h3>
                <p className="text-sm text-blue-800">
                  When affiliated users purchase subscriptions or make payments <strong>after</strong> importing your
                  program, you earn 20% of their payments.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex items-center justify-center flex-shrink-0 w-6 h-6 text-sm font-bold text-white bg-blue-500 rounded-full">
                3
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Earn Forever</h3>
                <p className="text-sm text-blue-800">
                  You continue earning 20% from subscription renewals and future purchases for as long as the user
                  remains subscribed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 border border-yellow-200 rounded-lg bg-yellow-50">
        <h3 className="mb-2 text-sm font-semibold text-yellow-900">Important Notes:</h3>
        <ul className="space-y-1 text-sm text-yellow-800">
          <li>
            • Only payments made <strong>after</strong> importing your program count toward commissions
          </li>
          <li>
            • If a user imports multiple programs, only the <strong>first</strong> program creator gets the commission
          </li>
          <li>• Refunded payments are excluded from commission calculations</li>
          <li>• Revenue share applies to both one-time purchases and recurring subscriptions</li>
        </ul>
      </div>

      {summary.totalUsers === 0 && (
        <div className="p-8 mt-8 text-center rounded-lg bg-gray-50">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">No affiliated users yet</h3>
          <p className="mb-4 text-gray-600">Start earning by creating and sharing great workout programs!</p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>• Publish your programs to make them discoverable</p>
            <p>• Share your program links on social media</p>
            <p>• Build a community around your training philosophy</p>
          </div>
        </div>
      )}
    </section>
  );
}
