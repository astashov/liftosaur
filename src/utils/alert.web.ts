export class AlertUtils {
  public static confirm(question: string, args: { onYes?: () => void; onNo?: () => void }): void {
    if (confirm(question)) {
      if (args.onYes) {
        args.onYes();
      }
    } else {
      if (args.onNo) {
        args.onNo();
      }
    }
  }
}
