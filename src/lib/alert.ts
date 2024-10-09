let lastAlertTime: number | undefined = undefined;

export function showAlert(message: string, cooldown: number): void {
  const now = Date.now();
  if (lastAlertTime != null && now - lastAlertTime < cooldown) {
    return;
  }
  lastAlertTime = now;
  alert(message);
}
