import { h, JSX } from "preact";

export interface IAffiliateDashboardContentProps {
  client: Window["fetch"];
  affiliateData: IAffiliateData[];
  affiliateId: string;
}

export interface IAffiliateData {
  userId: string;
  minTs: number;
  numberOfWorkouts: number;
  lastWorkoutTs: number;
  daysOfUsing: number;
  isEligible: boolean;
  isPaid: boolean;
}

export function AffiliateDashboardContent(props: IAffiliateDashboardContentProps): JSX.Element {
  return (
    <section className="py-16">
      <h2 className="mb-4 text-xl">
        Users coming from <strong>{props.affiliateId}</strong>
      </h2>
      <table className="w-full text-left">
        <thead>
          <tr>
            <th>User ID</th>
            <th>Registered</th>
            <th>Number of workouts</th>
            <th>Last workout date</th>
            <th>Days of using</th>
            <th>Eligible</th>
            <th>Is Paid</th>
          </tr>
        </thead>
        <tbody>
          {props.affiliateData.map((item) => {
            return (
              <tr>
                <td>{item.userId}</td>
                <td>{new Date(item.minTs).toLocaleString()}</td>
                <td>{item.numberOfWorkouts}</td>
                <td>{new Date(item.lastWorkoutTs).toLocaleString()}</td>
                <td>{item.daysOfUsing}</td>
                <td>{item.isEligible ? "Yes" : "No"}</td>
                <td>{item.isPaid ? "Yes" : "No"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
