import { ILoginConflictChoice, LoginConflict_isConfirmed, LoginConflict_typedPrompt } from "../models/loginConflict";
import { ILoginConflictSummary } from "../models/loginConflictSummary";

export interface ILoginConflictRequest {
  summary: ILoginConflictSummary;
  email: string;
  canCancel: boolean;
}

export class LoginConflictPrompt {
  private readonly confirm: (message: string) => Promise<string | undefined>;
  private pending?: { request: ILoginConflictRequest; resolve: (choice: ILoginConflictChoice) => void };
  private isConfirming = false;

  constructor(confirm: (message: string) => Promise<string | undefined>) {
    this.confirm = confirm;
  }

  public ask(request: ILoginConflictRequest): Promise<ILoginConflictChoice> {
    this.finish("switch");
    return new Promise((resolve) => {
      this.pending = { request, resolve };
    });
  }

  public async choose(choice: ILoginConflictChoice): Promise<void> {
    if (this.pending == null || this.isConfirming) {
      return;
    }
    const request = this.pending.request;
    if (choice === "cancel" && !request.canCancel) {
      return;
    }
    if (choice === "merge" || choice === "overwrite") {
      this.isConfirming = true;
      try {
        const answer = await this.confirm(LoginConflict_typedPrompt(choice, request.summary, request.email));
        if (!LoginConflict_isConfirmed(choice, answer) || this.pending?.request !== request) {
          return;
        }
      } finally {
        this.isConfirming = false;
      }
    }
    this.finish(choice);
  }

  private finish(choice: ILoginConflictChoice): void {
    const pending = this.pending;
    if (pending != null) {
      this.pending = undefined;
      pending.resolve(choice);
    }
  }
}
