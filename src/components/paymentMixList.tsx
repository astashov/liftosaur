import type { JSX } from "react";
import type { IPaymentMixEntry } from "../../lambda/utils/paymentMix";

export function PaymentMixList(props: { mix: IPaymentMixEntry[] }): JSX.Element {
  if (props.mix.length === 0) {
    return <span className="text-gray-400">—</span>;
  }
  return (
    <ul className="space-y-0.5 text-gray-700">
      {props.mix.map((entry) => (
        <li key={`${entry.currency}-${entry.plan}`} className="whitespace-nowrap">
          {entry.currency} · {entry.plan}
          {entry.count > 1 && <span className="ml-1 text-gray-400">×{entry.count}</span>}
          {entry.trials > 0 && (
            <span className="ml-1 text-gray-400">
              ({entry.trials === entry.count ? "trial" : `${entry.trials} trial${entry.trials > 1 ? "s" : ""}`})
            </span>
          )}
          <span className="ml-2 font-medium text-gray-900">
            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(entry.share)}
          </span>
        </li>
      ))}
    </ul>
  );
}
