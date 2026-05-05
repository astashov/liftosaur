import { Dialog_alert } from "../utils/dialog";

let lastAlertTime: number | undefined = undefined;

export function showAlert(message: string, cooldown: number): void {
  const now = Date.now();
  if (lastAlertTime != null && now - lastAlertTime < cooldown) {
    return;
  }
  lastAlertTime = now;
  Dialog_alert(message);
}
