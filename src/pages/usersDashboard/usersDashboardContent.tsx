import { h, JSX } from "preact";
import { CollectionUtils } from "../../utils/collection";
import { DateUtils } from "../../utils/date";

export interface IUsersDashboardContentProps {
  client: Window["fetch"];
  apiKey: string;
  usersData: IUsersDashboardData[];
}

export interface IUsersDashboardData {
  userId: string;
  email?: string;
  userTs?: number;
  reviewRequests: number[];
  signupRequests: number[];
  firstAction: { ts: number; name: string };
  lastAction: { ts: number; name: string };
  workoutsCount: number;
  platforms: string[];
  affiliates: string[];
  freeUserExpires?: number;
  programNames?: string[];
  subscriptions: ("apple" | "google" | "unclaimedkey" | "key")[];
  subscriptionDetails?: {
    product: "yearly" | "montly" | "lifetime";
    isTrial: boolean;
    isPromo: boolean;
    isActive: boolean;
    expires: number;
    promoCode?: string;
  };
}

function getIsNew(item: IUsersDashboardData): boolean {
  const firstActionDate = new Date(item.firstAction.ts);
  const lastActionDate = new Date(item.lastAction.ts);
  return (
    firstActionDate.getUTCFullYear() === lastActionDate.getUTCFullYear() &&
    firstActionDate.getUTCMonth() === lastActionDate.getUTCMonth() &&
    firstActionDate.getUTCDate() === lastActionDate.getUTCDate()
  );
}

function getIsNewUser(item: IUsersDashboardData): boolean {
  const lastActionDate = new Date(item.lastAction.ts);
  const userDate = item.userTs && new Date(item.userTs);
  return !!(
    userDate &&
    userDate.getUTCFullYear() === lastActionDate.getUTCFullYear() &&
    userDate.getUTCMonth() === lastActionDate.getUTCMonth() &&
    userDate.getUTCDate() === lastActionDate.getUTCDate()
  );
}

export function UsersDashboardContent(props: IUsersDashboardContentProps): JSX.Element {
  const data: IUsersDashboardData[][][] = [];
  let lastMonth;
  let lastDay;
  for (const user of props.usersData) {
    const month = new Date(user.lastAction.ts).getUTCMonth();
    const day = new Date(user.lastAction.ts).getUTCDate();
    if (lastMonth == null || lastMonth !== month) {
      data.push([]);
      lastMonth = month;
    }
    if (lastDay == null || lastDay !== day) {
      data[data.length - 1].push([]);
      lastDay = day;
    }
    const monthGroup = data[data.length - 1];
    const dayGroup = monthGroup[monthGroup.length - 1];
    dayGroup.push(user);
  }

  for (const monthGroup of data) {
    for (const dayGroup of monthGroup) {
      dayGroup.sort((a, b) => {
        const isANew = getIsNew(a);
        const isANewUser = getIsNewUser(a);
        const isBNew = getIsNew(b);
        const isBNewUser = getIsNewUser(b);

        if ((isANew || isANewUser) && !(isBNew || isBNewUser)) {
          return -1;
        } else if (!(isANew || isANewUser) && (isBNew || isBNewUser)) {
          return 1;
        } else {
          return b.lastAction.ts - a.lastAction.ts;
        }
      });
    }
  }

  return (
    <section className="py-16">
      <h2 className="mb-4 text-2xl font-bold">Users</h2>
      {data.map((monthGroup) => {
        const activeMontlyCount = monthGroup.reduce((acc, dayGroup) => acc + dayGroup.length, 0);
        const activeMonthlyRegisteredCount = monthGroup.reduce(
          (acc, dayGroup) => acc + dayGroup.filter((i) => i.email != null).length,
          0
        );
        const newThisMonth = monthGroup.reduce(
          (acc, dayGroup) =>
            acc + dayGroup.filter((i) => Date.now() - i.firstAction.ts < 1000 * 60 * 60 * 24 * 30).length,
          0
        );
        const newRegisteredThisMonth = monthGroup.reduce(
          (acc, dayGroup) =>
            acc + dayGroup.filter((i) => i.userTs != null && Date.now() - i.userTs < 1000 * 60 * 60 * 24 * 30).length,
          0
        );
        return (
          <div className="mb-16">
            <h3 className="mb-4 text-xl font-bold">
              {new Date(monthGroup[0][0].lastAction.ts).toLocaleString("en-us", { month: "long" })}
              <span>
                {" "}
                - {activeMontlyCount} active users, {activeMonthlyRegisteredCount} registered, {newThisMonth} new,{" "}
                {newRegisteredThisMonth} new registered
              </span>
            </h3>
            {monthGroup.map((dayGroup) => {
              const activeCount = dayGroup.length;
              const activeRegisteredCount = dayGroup.filter((i) => i.email != null).length;
              const newThisDay = dayGroup.filter((i) => Date.now() - i.firstAction.ts < 1000 * 60 * 60 * 24).length;
              const newRegisteredThisDay = dayGroup.filter(
                (i) => i.userTs != null && Date.now() - i.userTs < 1000 * 60 * 60 * 24
              ).length;
              return (
                <div className="mb-8">
                  <h4 className="mb-4 text-lg">
                    {DateUtils.format(dayGroup[0].lastAction.ts)}
                    <span>
                      {" "}
                      - {activeCount} active users, {activeRegisteredCount} registered, {newThisDay} new,{" "}
                      {newRegisteredThisDay} new registered
                    </span>
                  </h4>
                  <table className="w-full text-left" cellPadding={4}>
                    <thead>
                      <tr>
                        <th>User ID</th>
                        <th>Last</th>
                        <th>First</th>
                        <th>Workouts</th>
                        <th>Days</th>
                        <th>Programs</th>
                        <th>Platforms</th>
                        <th>Affiliates</th>
                        <th>Review Reqs</th>
                        <th>Signup Reqs</th>
                        <th>Free Exp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayGroup.map((item) => {
                        const isNew = getIsNew(item);
                        const isNewUser = getIsNewUser(item);
                        return (
                          <tr>
                            <td>
                              <div>
                                <span className={`${isNew ? "text-greenv2-main" : "text-blackv2"}`}>
                                  <a
                                    target="_blank"
                                    className="underline"
                                    href={`/dashboards/user/${item.userId}?key=${props.apiKey}`}
                                  >
                                    {item.userId}
                                  </a>
                                </span>
                                {item.subscriptions.indexOf("apple") !== -1 && (
                                  <span className="ml-2 font-bold text-redv2-main">A</span>
                                )}
                                {item.subscriptions.indexOf("google") !== -1 && (
                                  <span className="ml-2 font-bold text-greenv2-main">G</span>
                                )}
                                {item.subscriptions.indexOf("unclaimedkey") !== -1 && (
                                  <span className="ml-2 font-bold text-grayv2-main">F</span>
                                )}
                                {item.subscriptions.indexOf("key") !== -1 && (
                                  <span className="ml-2 font-bold text-greenv2-main">F</span>
                                )}
                                {item.subscriptionDetails?.isActive &&
                                  !item.subscriptionDetails?.isPromo &&
                                  !item.subscriptionDetails.isTrial && <span className="ml-2 font-bold">⭐</span>}
                              </div>
                              {item.email && (
                                <div>
                                  <a
                                    className="text-blue-700 underline"
                                    target="_blank"
                                    href={`/app?admin=${props.apiKey}&userid=${item.userId}&nosync=true`}
                                  >
                                    {item.email}
                                  </a>
                                </div>
                              )}
                              {item.userTs && (
                                <div
                                  className={`text-xs ${
                                    isNewUser ? "text-greenv2-main font-bold" : "text-grayv2-main"
                                  }`}
                                >
                                  {DateUtils.format(item.userTs)}
                                </div>
                              )}
                              {item.subscriptionDetails && (
                                <div className="text-xs text-grayv2-main">
                                  <div>
                                    {CollectionUtils.compact([
                                      item.subscriptionDetails.isActive ? "active" : undefined,
                                      item.subscriptionDetails.isTrial ? "trial" : undefined,
                                      item.subscriptionDetails.isPromo ? "promo" : undefined,
                                    ]).join(", ")}
                                  </div>
                                  {item.subscriptionDetails.promoCode && (
                                    <div>{item.subscriptionDetails.promoCode}</div>
                                  )}
                                  <div>Exp: {DateUtils.format(item.subscriptionDetails.expires)}</div>
                                </div>
                              )}
                            </td>
                            <td>
                              {new Date(item.lastAction.ts).toLocaleString()}
                              <div className="text-sm text-grayv2-main">{item.lastAction.name.replace("ls-", "")}</div>
                            </td>
                            <td>
                              {new Date(item.firstAction.ts).toLocaleString()}
                              <div className="text-sm text-grayv2-main">{item.firstAction.name.replace("ls-", "")}</div>
                            </td>
                            <td>{item.workoutsCount}</td>
                            <td>{Math.ceil((item.lastAction.ts - item.firstAction.ts) / (1000 * 60 * 60 * 24))}</td>
                            <td>
                              {(item.programNames || []).map((name) => (
                                <div>{name}</div>
                              ))}
                            </td>
                            <td>{item.platforms.join(", ")}</td>
                            <td>{item.affiliates.join(", ")}</td>
                            <td>
                              {item.reviewRequests.map((i) => (
                                <div>{DateUtils.format(i)}</div>
                              ))}
                            </td>
                            <td>{item.signupRequests.join(", ")}</td>
                            <td>{item.freeUserExpires && DateUtils.format(item.freeUserExpires)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
