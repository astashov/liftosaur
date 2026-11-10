import "mocha";
import { expect } from "chai";
import { ILoginConflictChoice } from "../src/models/loginConflict";
import { ILoginConflictRequest, LoginConflictPrompt } from "../src/utils/loginConflictPrompt";

const request: ILoginConflictRequest = {
  email: "a@b.c",
  summary: { accountWorkouts: 2, accountPrograms: 1, phoneOnlyWorkouts: 1, phoneOnlyPrograms: 0, phoneOnlyStats: 0 },
  canCancel: true,
};

function promptAnswering(...answers: (string | undefined)[]): { prompt: LoginConflictPrompt; messages: string[] } {
  const messages: string[] = [];
  const prompt = new LoginConflictPrompt(async (message) => {
    messages.push(message);
    return answers.shift();
  });
  return { prompt, messages };
}

function track(promise: Promise<ILoginConflictChoice>): { value?: ILoginConflictChoice } {
  const result: { value?: ILoginConflictChoice } = {};
  promise.then((choice) => (result.value = choice));
  return result;
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("LoginConflictPrompt", () => {
  it("resolves switch with no typed prompt", async () => {
    const { prompt, messages } = promptAnswering();
    const result = track(prompt.ask(request));
    await prompt.choose("switch");
    await flush();
    expect(result.value).to.equal("switch");
    expect(messages).to.eql([]);
  });

  it("resolves merge after the matching word", async () => {
    const { prompt, messages } = promptAnswering("merge");
    const result = track(prompt.ask(request));
    await prompt.choose("merge");
    await flush();
    expect(result.value).to.equal("merge");
    expect(messages[0]).to.contain("Type 'merge'");
  });

  it("stays open after cancel or a wrong word", async () => {
    const { prompt } = promptAnswering(undefined, "merge", "overwrite");
    const result = track(prompt.ask(request));
    await prompt.choose("overwrite");
    await prompt.choose("overwrite");
    await flush();
    expect(result.value).to.equal(undefined);
    await prompt.choose("overwrite");
    await flush();
    expect(result.value).to.equal("overwrite");
  });

  it("ignores a second tap while the typed prompt is open", async () => {
    const { prompt, messages } = promptAnswering("merge", "overwrite");
    const result = track(prompt.ask(request));
    await Promise.all([prompt.choose("merge"), prompt.choose("overwrite"), prompt.choose("switch")]);
    await flush();
    expect(result.value).to.equal("merge");
    expect(messages.length).to.equal(1);
  });

  it("does nothing without a pending request", async () => {
    const { prompt, messages } = promptAnswering("merge");
    await prompt.choose("merge");
    expect(messages).to.eql([]);
  });

  it("resolves cancel with no typed prompt", async () => {
    const { prompt, messages } = promptAnswering();
    const result = track(prompt.ask(request));
    await prompt.choose("cancel");
    await flush();
    expect(result.value).to.equal("cancel");
    expect(messages).to.eql([]);
  });

  it("ignores cancel when the request can't be cancelled", async () => {
    const { prompt } = promptAnswering();
    const result = track(prompt.ask({ ...request, canCancel: false }));
    await prompt.choose("cancel");
    await flush();
    expect(result.value).to.equal(undefined);
  });

  it("drops a typed confirmation when a newer request replaced the one it was typed for", async () => {
    let answer: (value: string) => void = () => undefined;
    const prompt = new LoginConflictPrompt(() => new Promise((resolve) => (answer = resolve)));
    const first = track(prompt.ask(request));
    const choosing = prompt.choose("overwrite");
    const second = track(prompt.ask({ ...request, email: "other@b.c" }));
    answer("overwrite");
    await choosing;
    await flush();
    expect(first.value).to.equal("switch");
    expect(second.value).to.equal(undefined);
  });
});
